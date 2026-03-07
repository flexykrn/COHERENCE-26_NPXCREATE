// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/**
 * @title AuditVRF
 * @notice Uses Chainlink VRF v2.5 to select a random spending batch for audit.
 *
 *         Why on-chain randomness?
 *         ------------------------
 *         A deterministic or admin-controlled audit selection can be gamed.
 *         By sourcing randomness from Chainlink VRF, the batch selected for
 *         audit is provably unbiased and cannot be predicted or manipulated
 *         by any single party — including the contract admin.
 *
 *         Flow
 *         ----
 *         1. Owner calls requestRandomAudit().
 *         2. VRF Coordinator is asked for 1 random word.
 *         3. Chainlink oracle fulfils the request by calling fulfillRandomWords().
 *         4. Selected batchId = randomWords[0] % totalBatches.
 *         5. AuditTriggered event is emitted with the chosen batchId.
 *
 * @dev VRF Coordinator on Hoodi / Sepolia: 0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B
 *      Key hash (500 gwei lane):           0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae
 */
contract AuditVRF is VRFConsumerBaseV2Plus {
    // ── VRF Configuration ─────────────────────────────────────────────────────

    /// @notice Chainlink VRF Coordinator address (Hoodi testnet).
    IVRFCoordinatorV2Plus public immutable COORDINATOR;

    /// @notice Gas-lane key hash (500 gwei on Hoodi / Sepolia).
    bytes32 public keyHash;

    /// @notice Chainlink subscription that funds VRF requests.
    uint256 public subscriptionId;

    /// @notice Gas limit for the fulfillRandomWords callback.
    uint32 public callbackGasLimit;

    /// @notice Request confirmations before VRF fulfils (3 is standard).
    uint16 public requestConfirmations;

    /// @notice We only need 1 random word to pick a batch.
    uint32 private constant NUM_WORDS = 1;

    // ── State ─────────────────────────────────────────────────────────────────

    /// @notice Total auditable batches (synced from MerkleRegistry or manually updated).
    uint256 public totalBatches;

    /// @notice requestId → batchId selected (0 until fulfilled).
    mapping(uint256 => uint256) public auditResults;

    /// @notice requestId → whether it has been fulfilled.
    mapping(uint256 => bool) public fulfilled;

    /// @notice requestId → requester address (for access control & logging).
    mapping(uint256 => address) public requesters;

    /// @notice Most recent VRF request ID.
    uint256 public lastRequestId;

    // ── Events ────────────────────────────────────────────────────────────────

    /**
     * @notice Emitted when a VRF request is sent to the Coordinator.
     * @param requestId Chainlink request ID.
     * @param requester Address that triggered the audit.
     */
    event AuditRequested(
        uint256 indexed requestId,
        address indexed requester
    );

    /**
     * @notice Emitted when Chainlink fulfils the request and a batch is selected.
     * @param requestId  Chainlink request ID.
     * @param batchId    Randomly selected batch index.
     * @param timestamp  Block timestamp of the fulfilment.
     */
    event AuditTriggered(
        uint256 indexed requestId,
        uint256 indexed batchId,
        uint256         timestamp
    );

    // ── Constructor ───────────────────────────────────────────────────────────

    /**
     * @param vrfCoordinator     Chainlink VRF Coordinator (Hoodi: 0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B).
     * @param _keyHash           Gas-lane key hash.
     * @param _subscriptionId    Chainlink subscription ID funding the requests.
     * @param _totalBatches      Initial count of auditable batches.
     * @dev                      msg.sender becomes the owner via ConfirmedOwner(msg.sender) in the base.
     */
    constructor(
        address vrfCoordinator,
        bytes32 _keyHash,
        uint256 _subscriptionId,
        uint256 _totalBatches
    )
        VRFConsumerBaseV2Plus(vrfCoordinator)
    {
        COORDINATOR        = IVRFCoordinatorV2Plus(vrfCoordinator);
        keyHash            = _keyHash;
        subscriptionId     = _subscriptionId;
        callbackGasLimit   = 100_000;
        requestConfirmations = 3;
        totalBatches       = _totalBatches;
    }

    // ── Core logic ────────────────────────────────────────────────────────────

    /**
     * @notice Request a random number from Chainlink VRF to select a batch for audit.
     * @dev    Only the owner (or DAO proxy) can trigger an audit request.
     *         Emits {AuditRequested}.
     * @return requestId The Chainlink VRF request ID.
     */
    function requestRandomAudit() external onlyOwner returns (uint256 requestId) {
        require(totalBatches > 0, "AuditVRF: no batches to audit");

        requestId = COORDINATOR.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash:             keyHash,
                subId:               subscriptionId,
                requestConfirmations: requestConfirmations,
                callbackGasLimit:    callbackGasLimit,
                numWords:            NUM_WORDS,
                extraArgs:           VRFV2PlusClient._argsToBytes(
                                         VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                                     )
            })
        );

        lastRequestId         = requestId;
        requesters[requestId] = msg.sender;

        emit AuditRequested(requestId, msg.sender);
    }

    /**
     * @notice Chainlink VRF callback — do NOT call directly.
     * @dev    Selects batchId = randomWords[0] % totalBatches.
     *         Emits {AuditTriggered}.
     * @param  requestId   The request ID that was fulfilled.
     * @param  randomWords Array of random values from Chainlink (length = NUM_WORDS).
     */
    function fulfillRandomWords(
        uint256            requestId,
        uint256[] calldata randomWords
    ) internal override {
        require(!fulfilled[requestId], "AuditVRF: already fulfilled");

        uint256 batchId = randomWords[0] % totalBatches;

        fulfilled[requestId]     = true;
        auditResults[requestId]  = batchId;

        emit AuditTriggered(requestId, batchId, block.timestamp);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    /**
     * @notice Update the total batch count (call after new batches are submitted
     *         to MerkleRegistry so the modulo range stays accurate).
     * @param  _totalBatches New total.
     */
    function setTotalBatches(uint256 _totalBatches) external onlyOwner {
        require(_totalBatches > 0, "AuditVRF: zero batches");
        totalBatches = _totalBatches;
    }

    /**
     * @notice Update VRF subscription ID (e.g. after topping up or rotating subs).
     * @param  _subscriptionId New subscription ID.
     */
    function setSubscriptionId(uint256 _subscriptionId) external onlyOwner {
        subscriptionId = _subscriptionId;
    }

    /**
     * @notice Update the gas limit for the VRF callback.
     * @param  _limit New gas limit (suggested: 100_000–300_000).
     */
    function setCallbackGasLimit(uint32 _limit) external onlyOwner {
        require(_limit >= 50_000, "AuditVRF: gas limit too low");
        callbackGasLimit = _limit;
    }

    /**
     * @notice Update the gas-lane key hash (e.g. switch from 500 gwei to 1500 gwei lane).
     * @param  _keyHash New key hash.
     */
    function setKeyHash(bytes32 _keyHash) external onlyOwner {
        require(_keyHash != bytes32(0), "AuditVRF: zero key hash");
        keyHash = _keyHash;
    }

    // ── View helpers ─────────────────────────────────────────────────────────

    /**
     * @notice Retrieve the audit result for a fulfilled request.
     * @param  requestId VRF request ID.
     * @return batchId   The randomly selected batch index.
     * @return done      True if the request has been fulfilled.
     */
    function getAuditResult(uint256 requestId)
        external
        view
        returns (uint256 batchId, bool done)
    {
        return (auditResults[requestId], fulfilled[requestId]);
    }
}
