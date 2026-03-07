// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title RollupBatch
 * @notice Stores Merkle roots for batches of government spending transactions.
 *         Anyone can verify any individual transaction is part of a submitted batch.
 *         Deployed on Hoodi testnet (chain ID 560048).
 */
contract RollupBatch {
    address public admin;

    struct Batch {
        bytes32 merkleRoot;
        string  batchRef;
        uint256 txCount;
        uint256 submittedAt;
    }

    Batch[] public batches;

    // ── Events ────────────────────────────────────────────────────────────────
    event BatchSubmitted(
        uint256 indexed batchIndex,
        bytes32 indexed merkleRoot,
        string  batchRef,
        uint256 txCount
    );
    event TransactionVerified(
        uint256 indexed batchIndex,
        bytes32 indexed leaf,
        bool    valid
    );
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyAdmin() {
        require(msg.sender == admin, "RollupBatch: caller is not admin");
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor() {
        admin = msg.sender;
    }

    // ── Write functions ───────────────────────────────────────────────────────

    /**
     * @notice Submit a new rollup batch. Only admin/relayer can call.
     * @param _merkleRoot  Merkle root of the batch (sorted-pair SHA-256 stand-in)
     * @param _batchRef    Human-readable label, e.g. "Batch #0 — 50 txns"
     * @param _txCount     Number of transactions in this batch
     */
    function submitBatch(
        bytes32 _merkleRoot,
        string  calldata _batchRef,
        uint256 _txCount
    ) external onlyAdmin {
        batches.push(Batch({
            merkleRoot:  _merkleRoot,
            batchRef:    _batchRef,
            txCount:     _txCount,
            submittedAt: block.timestamp
        }));
        emit BatchSubmitted(batches.length - 1, _merkleRoot, _batchRef, _txCount);
    }

    /**
     * @notice Verify a transaction leaf against a stored batch root (emits event).
     * @param leaf        keccak256 leaf hash of the transaction
     * @param proof       Merkle proof path (sorted-pair, OpenZeppelin-compatible)
     * @param batchIndex  Index of the batch to verify against
     * @return valid      True if the leaf is part of the batch
     */
    function verifyTransaction(
        bytes32          leaf,
        bytes32[] calldata proof,
        uint256          batchIndex
    ) external returns (bool valid) {
        require(batchIndex < batches.length, "RollupBatch: batch not found");
        valid = MerkleProof.verify(proof, batches[batchIndex].merkleRoot, leaf);
        emit TransactionVerified(batchIndex, leaf, valid);
    }

    // ── Read functions ────────────────────────────────────────────────────────

    /**
     * @notice Verify without writing to state (gas-free call).
     */
    function verifyTransactionView(
        bytes32          leaf,
        bytes32[] calldata proof,
        uint256          batchIndex
    ) external view returns (bool) {
        require(batchIndex < batches.length, "RollupBatch: batch not found");
        return MerkleProof.verify(proof, batches[batchIndex].merkleRoot, leaf);
    }

    function getBatchCount() external view returns (uint256) {
        return batches.length;
    }

    function getBatch(uint256 index)
        external
        view
        returns (
            bytes32 merkleRoot,
            string  memory batchRef,
            uint256 txCount,
            uint256 submittedAt
        )
    {
        require(index < batches.length, "RollupBatch: index out of bounds");
        Batch storage b = batches[index];
        return (b.merkleRoot, b.batchRef, b.txCount, b.submittedAt);
    }

    /**
     * @notice Transfer admin role to a new address.
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "RollupBatch: zero address");
        emit AdminTransferred(admin, newAdmin);
        admin = newAdmin;
    }
}
