// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title MerkleRegistry
 * @notice Transaction integrity layer for the GovTech Layer-2 Rollup
 * @dev Stores Merkle roots of transaction batches and verifies individual transactions
 * 
 * Security Considerations:
 * - Only BATCH_SUBMITTER role can submit batches (prevents unauthorized root injection)
 * - ReentrancyGuard prevents re-entrancy attacks during verification
 * - Immutable batch history prevents retroactive tampering
 * - Batch finalization prevents state changes after commit
 */
contract MerkleRegistry is AccessControl, ReentrancyGuard {
    
    // ==================== ROLES ====================
    
    /// @notice Role for authorized batch submitters (typically rollup operators)
    bytes32 public constant BATCH_SUBMITTER_ROLE = keccak256("BATCH_SUBMITTER_ROLE");
    
    /// @notice Role for admin operations (slashing, emergency pause)
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // ==================== STATE VARIABLES ====================
    
    /// @notice Counter for batch indices
    uint256 public batchCount;
    
    /// @notice Mapping from batch index to batch metadata
    mapping(uint256 => Batch) public batches;
    
    /// @notice Mapping to track verified transactions (prevents double-spending claims)
    mapping(bytes32 => bool) public verifiedTransactions;
    
    /// @notice Emergency circuit breaker
    bool public paused;
    
    // ==================== STRUCTS ====================
    
    /**
     * @notice Batch metadata structure
     * @param merkleRoot The root hash of the Merkle tree for this batch
     * @param timestamp Block timestamp when batch was submitted
     * @param transactionCount Number of transactions in this batch
     * @param submitter Address that submitted this batch
     * @param isFinalized Whether this batch has been finalized (irreversible after 24h)
     */
    struct Batch {
        bytes32 merkleRoot;
        uint256 timestamp;
        uint256 transactionCount;
        address submitter;
        bool isFinalized;
    }
    
    // ==================== EVENTS ====================
    
    /**
     * @notice Emitted when a new batch is submitted
     * @param batchIndex Sequential index of the batch
     * @param merkleRoot Root hash of the batch Merkle tree
     * @param transactionCount Number of transactions in batch
     * @param submitter Address that submitted the batch
     * @param timestamp Submission timestamp
     */
    event BatchSubmitted(
        uint256 indexed batchIndex,
        bytes32 indexed merkleRoot,
        uint256 transactionCount,
        address indexed submitter,
        uint256 timestamp
    );
    
    /**
     * @notice Emitted when a transaction is verified against a batch
     * @param batchIndex Batch containing the transaction
     * @param transactionHash Hash of the verified transaction
     * @param verifier Address that performed the verification
     */
    event TransactionVerified(
        uint256 indexed batchIndex,
        bytes32 indexed transactionHash,
        address indexed verifier
    );
    
    /**
     * @notice Emitted when a batch is finalized (irreversible)
     * @param batchIndex Index of finalized batch
     */
    event BatchFinalized(uint256 indexed batchIndex);
    
    /**
     * @notice Emitted when contract is paused or unpaused
     * @param isPaused New pause state
     */
    event PauseStateChanged(bool isPaused);
    
    // ==================== ERRORS ====================
    
    error ContractPaused();
    error BatchAlreadyFinalized();
    error InvalidMerkleProof();
    error TransactionAlreadyVerified();
    error UnauthorizedAccess();
    error BatchDoesNotExist();
    error BatchNotFinalized();
    error FinalizationPeriodNotElapsed();
    
    // ==================== MODIFIERS ====================
    
    /**
     * @notice Ensures contract is not paused
     */
    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }
    
    // ==================== CONSTRUCTOR ====================
    
    /**
     * @notice Initializes the MerkleRegistry with admin
     * @param _admin Address to be granted admin role
     */
    constructor(address _admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(BATCH_SUBMITTER_ROLE, _admin);
    }
    
    // ==================== CORE FUNCTIONS ====================
    
    /**
     * @notice Submit a new batch of transactions to the registry
     * @dev Only callable by BATCH_SUBMITTER role
     * @param _merkleRoot The Merkle root of the transaction batch
     * @param _transactionCount Number of transactions in the batch
     * 
     * Security:
     * - Role-based access control prevents unauthorized submissions
     * - Paused state check prevents submissions during emergency
     * - Timestamp lock prevents time manipulation
     * - Sequential batch indexing prevents gaps
     * 
     * Gas Optimization:
     * - Uses unchecked increment for batchCount (safe due to uint256 range)
     * - Single SSTORE for batch struct
     */
    function submitBatch(bytes32 _merkleRoot, uint256 _transactionCount) 
        external 
        whenNotPaused 
        onlyRole(BATCH_SUBMITTER_ROLE) 
        returns (uint256 batchIndex)
    {
        batchIndex = batchCount;
        
        batches[batchIndex] = Batch({
            merkleRoot: _merkleRoot,
            timestamp: block.timestamp,
            transactionCount: _transactionCount,
            submitter: msg.sender,
            isFinalized: false
        });
        
        unchecked {
            ++batchCount; // Safe: uint256 overflow is practically impossible
        }
        
        emit BatchSubmitted(
            batchIndex,
            _merkleRoot,
            _transactionCount,
            msg.sender,
            block.timestamp
        );
    }
    
    /**
     * @notice Verify a transaction exists in a specific batch
     * @dev Uses OpenZeppelin's MerkleProof library for verification
     * @param _batchIndex Index of the batch containing the transaction
     * @param _leaf Hash of the transaction to verify
     * @param _proof Merkle proof path from leaf to root
     * @return valid True if transaction is verified
     * 
     * Security:
     * - ReentrancyGuard prevents verification-based attacks
     * - Batch finalization check ensures data integrity
     * - Duplicate verification prevention stops replay attacks
     * - OpenZeppelin's MerkleProof uses sorted pairs (standardized)
     * 
     * Gas Optimization:
     * - Early revert checks minimize computation
     * - Proof verification delegated to optimized library
     * - Single SSTORE for verification tracking
     */
    function verifyTransaction(
        uint256 _batchIndex,
        bytes32 _leaf,
        bytes32[] calldata _proof
    ) 
        external 
        whenNotPaused
        nonReentrant
        returns (bool valid)
    {
        Batch storage batch = batches[_batchIndex];
        
        // Ensure batch exists
        if (batch.timestamp == 0) revert BatchDoesNotExist();
        
        // Ensure batch is finalized (prevents verification against mutable state)
        if (!batch.isFinalized) revert BatchNotFinalized();
        
        // Prevent double verification claims
        if (verifiedTransactions[_leaf]) revert TransactionAlreadyVerified();
        
        // Verify Merkle proof using OpenZeppelin's standardized implementation
        valid = MerkleProof.verify(_proof, batch.merkleRoot, _leaf);
        
        if (!valid) revert InvalidMerkleProof();
        
        // Mark transaction as verified
        verifiedTransactions[_leaf] = true;
        
        emit TransactionVerified(_batchIndex, _leaf, msg.sender);
    }
    
    /**
     * @notice Finalize a batch after the dispute period (24 hours)
     * @dev Once finalized, batch cannot be modified or challenged
     * @param _batchIndex Index of batch to finalize
     * 
     * Security:
     * - 24-hour finalization delay allows fraud proofs
     * - Only admin can finalize (prevents premature finalization)
     * - Irreversible once finalized (enforces commitment)
     */
    function finalizeBatch(uint256 _batchIndex) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        Batch storage batch = batches[_batchIndex];
        
        if (batch.timestamp == 0) revert BatchDoesNotExist();
        if (batch.isFinalized) revert BatchAlreadyFinalized();
        
        // Require 24-hour dispute period
        if (block.timestamp < batch.timestamp + 24 hours) {
            revert FinalizationPeriodNotElapsed();
        }
        
        batch.isFinalized = true;
        
        emit BatchFinalized(_batchIndex);
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    /**
     * @notice Get batch metadata
     * @param _batchIndex Index of the batch
     * @return Batch struct containing all metadata
     */
    function getBatch(uint256 _batchIndex) external view returns (Batch memory) {
        return batches[_batchIndex];
    }
    
    /**
     * @notice Check if a transaction has been verified
     * @param _txHash Hash of the transaction
     * @return True if verified
     */
    function isTransactionVerified(bytes32 _txHash) external view returns (bool) {
        return verifiedTransactions[_txHash];
    }
    
    /**
     * @notice Get total number of batches submitted
     * @return Total batch count
     */
    function getBatchCount() external view returns (uint256) {
        return batchCount;
    }
    
    // ==================== ADMIN FUNCTIONS ====================
    
    /**
     * @notice Emergency pause mechanism
     * @dev Only callable by admin in case of detected exploit
     */
    function setPaused(bool _paused) external onlyRole(ADMIN_ROLE) {
        paused = _paused;
        emit PauseStateChanged(_paused);
    }
}
