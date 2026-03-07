// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MerkleRegistry
 * @notice Central on-chain registry for government spending Merkle roots.
 *         Each batch of transactions is committed as a single Merkle root.
 *         Any individual transaction can be verified against the stored root
 *         without revealing the entire dataset (minimal-disclosure proof).
 *
 * @dev Deployed on Hoodi testnet (chain ID 560048).
 *      Owner (deployer) is the only address authorised to submit roots;
 *      verification is permissionless (anyone can audit).
 */
contract MerkleRegistry is Ownable {
    // ── State ─────────────────────────────────────────────────────────────────

    /// @dev Auto-incremented counter; also equals total batches submitted.
    uint256 private _nextBatchId;

    /// @notice batchId → Merkle root
    mapping(uint256 => bytes32) public batchRoots;

    /// @notice batchId → unix timestamp of submission
    mapping(uint256 => uint256) public batchTimestamps;

    // ── Events ────────────────────────────────────────────────────────────────

    /**
     * @notice Emitted every time a new batch root is committed to the chain.
     * @param batchId    Sequential ID starting at 0.
     * @param merkleRoot The Merkle root that represents all txns in the batch.
     * @param submitter  Address that called submitBatch (owner / relayer).
     * @param timestamp  Block timestamp of the submission.
     */
    event BatchSubmitted(
        uint256 indexed batchId,
        bytes32 indexed merkleRoot,
        address indexed submitter,
        uint256         timestamp
    );

    /**
     * @notice Emitted every time verifyTransaction is called (state-writing path).
     * @param batchId   Batch that was checked.
     * @param leaf      keccak256 hash of the transaction data.
     * @param valid     Whether the proof resolved to the stored root.
     * @param verifier  Address that requested the verification.
     */
    event TransactionVerified(
        uint256 indexed batchId,
        bytes32 indexed leaf,
        bool            valid,
        address indexed verifier
    );

    // ── Constructor ───────────────────────────────────────────────────────────

    /**
     * @param initialOwner Address granted the OWNER role on deployment.
     *                     Typically the deployer EOA or a multi-sig.
     */
    constructor(address initialOwner) Ownable(initialOwner) {}

    // ── Write functions ───────────────────────────────────────────────────────

    /**
     * @notice Commit a Merkle root for a new spending batch.
     * @dev    Only callable by the contract owner (admin / relayer wallet).
     *         Emits {BatchSubmitted}.
     * @param  _merkleRoot Sorted-pair, double-keccak256 Merkle root (OpenZeppelin-compatible).
     * @return batchId     The sequential ID assigned to this batch (0-indexed).
     */
    function submitBatch(bytes32 _merkleRoot)
        external
        onlyOwner
        returns (uint256 batchId)
    {
        require(_merkleRoot != bytes32(0), "MerkleRegistry: zero root");

        batchId = _nextBatchId;
        batchRoots[batchId]      = _merkleRoot;
        batchTimestamps[batchId] = block.timestamp;
        _nextBatchId++;

        emit BatchSubmitted(batchId, _merkleRoot, msg.sender, block.timestamp);
    }

    /**
     * @notice Verify a transaction leaf against a stored batch root.
     *         Writes a {TransactionVerified} event so the result is
     *         publicly auditable on-chain.
     * @param  leaf     keccak256(abi.encodePacked(<txn fields>))
     * @param  proof    Sibling hashes from leaf up to root.
     * @param  batchId  ID of the batch to check against.
     * @return valid    True if the proof resolves to the stored root.
     */
    function verifyTransaction(
        bytes32          leaf,
        bytes32[] calldata proof,
        uint256          batchId
    ) external returns (bool valid) {
        require(batchId < _nextBatchId, "MerkleRegistry: batch not found");
        valid = MerkleProof.verify(proof, batchRoots[batchId], leaf);
        emit TransactionVerified(batchId, leaf, valid, msg.sender);
    }

    // ── Read functions ────────────────────────────────────────────────────────

    /**
     * @notice Gas-free verification (no event emitted, no storage write).
     * @param  leaf    keccak256 hash of the transaction.
     * @param  proof   Merkle proof path.
     * @param  batchId Batch to verify against.
     * @return         True if the leaf is included in the named batch.
     */
    function verifyTransactionView(
        bytes32          leaf,
        bytes32[] calldata proof,
        uint256          batchId
    ) external view returns (bool) {
        require(batchId < _nextBatchId, "MerkleRegistry: batch not found");
        return MerkleProof.verify(proof, batchRoots[batchId], leaf);
    }

    /**
     * @notice Total number of batches submitted so far.
     */
    function totalBatches() external view returns (uint256) {
        return _nextBatchId;
    }

    /**
     * @notice Fetch root + timestamp for a batch in a single call.
     * @param  batchId   Batch to query.
     * @return root      Stored Merkle root.
     * @return timestamp Block timestamp when the batch was submitted.
     */
    function getBatch(uint256 batchId)
        external
        view
        returns (bytes32 root, uint256 timestamp)
    {
        require(batchId < _nextBatchId, "MerkleRegistry: batch not found");
        root      = batchRoots[batchId];
        timestamp = batchTimestamps[batchId];
    }
}
