// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MultiSigReallocation
 * @notice Governance contract that executes inter-departmental budget
 *         reallocations only when ≥ 3 of 5 authorised governance signers
 *         approve the transaction off-chain.
 *
 *         Security model
 *         --------------
 *         - Off-chain signers produce EIP-712 typed-data signatures over a
 *           `Reallocation` struct that includes a nonce and a deadline.
 *         - The contract verifies ECDSA signatures, checks each recovered
 *           address is an authorised signer, and rejects replay attacks via
 *           the monotonically-increasing nonce.
 *         - Deadline prevents stale signatures from being used.
 *         - A reallocation is a logical operation (emits an event); actual
 *           ETH / token transfers can be layered on top.
 *
 * @dev Deployed on Hoodi testnet (chain ID 560048).
 */
contract MultiSigReallocation is EIP712, Ownable {
    using ECDSA for bytes32;

    // ── Constants ─────────────────────────────────────────────────────────────

    /// @notice Required number of valid signatures.
    uint256 public constant THRESHOLD = 3;

    /// @notice Maximum number of signers.
    uint256 public constant MAX_SIGNERS = 5;

    // ── EIP-712 type hash ─────────────────────────────────────────────────────

    /**
     * @dev keccak256 of the canonical Reallocation type string.
     *      Any change to field names/types must be reflected here.
     */
    bytes32 public constant REALLOCATION_TYPEHASH = keccak256(
        "Reallocation(address fromDept,address toDept,uint256 amount,uint256 nonce,uint256 deadline)"
    );

    // ── Structs ───────────────────────────────────────────────────────────────

    /**
     * @notice The data payload signers approve off-chain.
     * @param fromDept  Sending department's address (identifier, not a wallet).
     * @param toDept    Receiving department's address.
     * @param amount    Budget amount to reallocate (denominated in wei / tokens).
     * @param nonce     Contract's current nonce — prevents replay.
     * @param deadline  Unix timestamp after which the proposal expires.
     */
    struct Reallocation {
        address fromDept;
        address toDept;
        uint256 amount;
        uint256 nonce;
        uint256 deadline;
    }

    // ── State ─────────────────────────────────────────────────────────────────

    /// @notice The five authorised governance signers.
    address[MAX_SIGNERS] public signers;

    /// @notice Quick O(1) look-up for signer membership.
    mapping(address => bool) public isSigner;

    /// @notice Current nonce; incremented on each successful execution.
    uint256 public nonce;

    // ── Events ────────────────────────────────────────────────────────────────

    /**
     * @notice Emitted on every successful reallocation.
     * @param fromDept  Sending department.
     * @param toDept    Receiving department.
     * @param amount    Amount reallocated.
     * @param nonce     Nonce value used (incremented afterwards).
     * @param executor  Address that called executeReallocation.
     */
    event ReallocationExecuted(
        address indexed fromDept,
        address indexed toDept,
        uint256         amount,
        uint256         nonce,
        address indexed executor
    );

    /// @notice Emitted when the signer set is updated.
    event SignersUpdated(address[MAX_SIGNERS] newSigners);

    // ── Constructor ───────────────────────────────────────────────────────────

    /**
     * @param initialOwner  Admin who can update the signer set.
     * @param _signers      Exactly 5 governance signer addresses.
     */
    constructor(
        address initialOwner,
        address[MAX_SIGNERS] memory _signers
    )
        EIP712("MultiSigReallocation", "1")
        Ownable(initialOwner)
    {
        _setSigners(_signers);
    }

    // ── Core logic ────────────────────────────────────────────────────────────

    /**
     * @notice Execute a budget reallocation after collecting ≥ THRESHOLD valid sigs.
     * @dev    Emits {ReallocationExecuted}.
     *
     *         `signatures` must be sorted in ascending order of the recovered
     *         signer address to prevent duplicates cheaply without O(n²) work.
     *
     * @param fromDept    Source department address.
     * @param toDept      Destination department address.
     * @param amount      Amount to reallocate.
     * @param deadline    Expiry timestamp (must be in the future).
     * @param signatures  EIP-712 signatures; must be sorted ascending by signer address.
     */
    function executeReallocation(
        address          fromDept,
        address          toDept,
        uint256          amount,
        uint256          deadline,
        bytes[] calldata signatures
    ) external {
        require(fromDept  != address(0),            "MultiSig: zero fromDept");
        require(toDept    != address(0),            "MultiSig: zero toDept");
        require(fromDept  != toDept,                "MultiSig: same dept");
        require(amount    > 0,                      "MultiSig: zero amount");
        require(block.timestamp <= deadline,        "MultiSig: deadline expired");
        require(signatures.length >= THRESHOLD,     "MultiSig: insufficient signatures");

        // Build the EIP-712 struct hash
        bytes32 structHash = keccak256(abi.encode(
            REALLOCATION_TYPEHASH,
            fromDept,
            toDept,
            amount,
            nonce,
            deadline
        ));
        bytes32 digest = _hashTypedDataV4(structHash);

        // Verify signatures — sorted-ascending to prevent duplicates
        address lastSigner = address(0);
        uint256 validCount = 0;

        for (uint256 i = 0; i < signatures.length; i++) {
            address recovered = digest.recover(signatures[i]);
            require(recovered > lastSigner, "MultiSig: unsorted or duplicate signer");
            if (isSigner[recovered]) {
                validCount++;
            }
            lastSigner = recovered;
        }

        require(validCount >= THRESHOLD, "MultiSig: threshold not met");

        uint256 usedNonce = nonce;
        nonce++;

        emit ReallocationExecuted(fromDept, toDept, amount, usedNonce, msg.sender);
    }

    // ── Read helpers ──────────────────────────────────────────────────────────

    /**
     * @notice Compute the EIP-712 digest for a Reallocation struct.
     *         Use this off-chain to derive what each signer should sign.
     * @param  fromDept  Source department.
     * @param  toDept    Destination department.
     * @param  amount    Amount.
     * @param  _nonce    Nonce (use current `nonce` state variable value).
     * @param  deadline  Expiry timestamp.
     * @return           The EIP-712 digest.
     */
    function getDigest(
        address fromDept,
        address toDept,
        uint256 amount,
        uint256 _nonce,
        uint256 deadline
    ) external view returns (bytes32) {
        bytes32 structHash = keccak256(abi.encode(
            REALLOCATION_TYPEHASH,
            fromDept,
            toDept,
            amount,
            _nonce,
            deadline
        ));
        return _hashTypedDataV4(structHash);
    }

    /**
     * @notice Returns the current list of authorised signers.
     */
    function getSigners() external view returns (address[MAX_SIGNERS] memory) {
        return signers;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    /**
     * @notice Replace the entire signer set (all 5 at once).
     * @dev    Only callable by owner.  Emits {SignersUpdated}.
     * @param  _signers New set of exactly 5 unique non-zero signer addresses.
     */
    function updateSigners(address[MAX_SIGNERS] memory _signers) external onlyOwner {
        _setSigners(_signers);
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    function _setSigners(address[MAX_SIGNERS] memory _signers) internal {
        // Clear old signer set
        for (uint256 i = 0; i < MAX_SIGNERS; i++) {
            if (signers[i] != address(0)) {
                isSigner[signers[i]] = false;
            }
        }
        // Register new signers
        for (uint256 i = 0; i < MAX_SIGNERS; i++) {
            address s = _signers[i];
            require(s != address(0),   "MultiSig: zero signer");
            require(!isSigner[s],      "MultiSig: duplicate signer");
            signers[i] = s;
            isSigner[s] = true;
        }
        emit SignersUpdated(_signers);
    }
}
