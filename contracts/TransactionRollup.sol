// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TransactionRollup
 * @dev Rollup contract for batching government transactions on Hoodi ETH network
 * Compatible with OpenZeppelin MerkleProof verification
 */
contract TransactionRollup {
    // State variables
    address public admin;
    uint256 public batchCount;
    
    // Struct to store batch information
    struct Batch {
        bytes32 merkleRoot;
        uint256 timestamp;
        uint256 transactionCount;
        string metadataURI; // IPFS hash or API endpoint for batch details
        bool isFinalized;
    }
    
    // Mapping from batch index to batch data
    mapping(uint256 => Batch) public batches;
    
    // Events
    event BatchSubmitted(
        uint256 indexed batchIndex,
        bytes32 indexed merkleRoot,
        uint256 timestamp,
        uint256 transactionCount,
        string metadataURI
    );
    
    event BatchFinalized(
        uint256 indexed batchIndex,
        bytes32 merkleRoot
    );
    
    event TransactionVerified(
        uint256 indexed batchIndex,
        bytes32 indexed leaf,
        address indexed verifier
    );
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier batchExists(uint256 _batchIndex) {
        require(_batchIndex < batchCount, "Batch does not exist");
        _;
    }
    
    // Constructor
    constructor() {
        admin = msg.sender;
        batchCount = 0;
    }
    
    /**
     * @dev Submit a new batch of transactions
     * @param _merkleRoot The Merkle root of the transaction batch
     * @param _transactionCount Number of transactions in the batch
     * @param _metadataURI URI pointing to batch metadata (IPFS or API)
     */
    function submitBatch(
        bytes32 _merkleRoot,
        uint256 _transactionCount,
        string memory _metadataURI
    ) external onlyAdmin returns (uint256) {
        require(_merkleRoot != bytes32(0), "Invalid Merkle root");
        require(_transactionCount > 0, "Transaction count must be > 0");
        
        uint256 batchIndex = batchCount;
        
        batches[batchIndex] = Batch({
            merkleRoot: _merkleRoot,
            timestamp: block.timestamp,
            transactionCount: _transactionCount,
            metadataURI: _metadataURI,
            isFinalized: false
        });
        
        batchCount++;
        
        emit BatchSubmitted(
            batchIndex,
            _merkleRoot,
            block.timestamp,
            _transactionCount,
            _metadataURI
        );
        
        return batchIndex;
    }
    
    /**
     * @dev Finalize a batch (prevents modification)
     * @param _batchIndex The index of the batch to finalize
     */
    function finalizeBatch(uint256 _batchIndex) 
        external 
        onlyAdmin 
        batchExists(_batchIndex) 
    {
        require(!batches[_batchIndex].isFinalized, "Batch already finalized");
        
        batches[_batchIndex].isFinalized = true;
        
        emit BatchFinalized(_batchIndex, batches[_batchIndex].merkleRoot);
    }
    
    /**
     * @dev Verify a transaction using Merkle proof
     * @param _leaf The transaction leaf hash
     * @param _proof Array of sibling hashes for Merkle proof
     * @param _batchIndex The batch index to verify against
     * @return bool True if transaction is verified
     */
    function verifyTransaction(
        bytes32 _leaf,
        bytes32[] memory _proof,
        uint256 _batchIndex
    ) external batchExists(_batchIndex) returns (bool) {
        bytes32 root = batches[_batchIndex].merkleRoot;
        bool isValid = verify(_proof, root, _leaf);
        
        if (isValid) {
            emit TransactionVerified(_batchIndex, _leaf, msg.sender);
        }
        
        return isValid;
    }
    
    /**
     * @dev Pure verification function (no state changes)
     * @param _proof Array of sibling hashes
     * @param _root The Merkle root to verify against
     * @param _leaf The leaf to verify
     * @return bool True if proof is valid
     */
    function verify(
        bytes32[] memory _proof,
        bytes32 _root,
        bytes32 _leaf
    ) public pure returns (bool) {
        bytes32 computedHash = _leaf;
        
        for (uint256 i = 0; i < _proof.length; i++) {
            bytes32 proofElement = _proof[i];
            
            // OpenZeppelin sorted-pair hashing algorithm
            if (computedHash <= proofElement) {
                computedHash = keccak256(
                    abi.encodePacked(computedHash, proofElement)
                );
            } else {
                computedHash = keccak256(
                    abi.encodePacked(proofElement, computedHash)
                );
            }
        }
        
        return computedHash == _root;
    }
    
    /**
     * @dev Get batch details
     * @param _batchIndex The batch index
     * @return Batch struct with all details
     */
    function getBatch(uint256 _batchIndex) 
        external 
        view 
        batchExists(_batchIndex) 
        returns (Batch memory) 
    {
        return batches[_batchIndex];
    }
    
    /**
     * @dev Get all batch roots (for quick lookup)
     * @return Array of Merkle roots
     */
    function getAllBatchRoots() external view returns (bytes32[] memory) {
        bytes32[] memory roots = new bytes32[](batchCount);
        
        for (uint256 i = 0; i < batchCount; i++) {
            roots[i] = batches[i].merkleRoot;
        }
        
        return roots;
    }
    
    /**
     * @dev Transfer admin role
     * @param _newAdmin Address of new admin
     */
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid address");
        admin = _newAdmin;
    }
    
    /**
     * @dev Get contract version
     * @return Version string
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}
