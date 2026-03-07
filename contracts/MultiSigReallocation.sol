// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title MultiSigReallocation
 * @notice Multi-signature fund reallocation using EIP-712 typed signatures
 * @dev Prevents replay attacks and requires M-of-N governance approval for fund transfers
 * 
 * Security Considerations:
 * - EIP-712 prevents signature replay across chains/contracts
 * - Nonce system prevents transaction replay
 * - M-of-N threshold prevents single point of failure
 * - Time-bound executions prevent indefinite signature validity
 * - ReentrancyGuard prevents reentrancy attacks
 * - Role-based access for governance management
 */
contract MultiSigReallocation is AccessControl, ReentrancyGuard, EIP712 {
    using ECDSA for bytes32;
    
    // ==================== ROLES ====================
    
    /// @notice Role for admin operations
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    /// @notice Role for governance signers
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    
    // ==================== STATE VARIABLES ====================
    
    /// @notice Required number of signatures for execution (M in M-of-N)
    uint256 public requiredSignatures = 3;
    
    /// @notice Total number of governance signers (N in M-of-N)
    uint256 public totalGovernors;
    
    /// @notice Mapping of addresses authorized to sign reallocations
    mapping(address => bool) public isGovernor;
    
    /// @notice Array of governor addresses (for enumeration)
    address[] public governors;
    
    /// @notice Mapping to track executed reallocations (prevents replay)
    mapping(bytes32 => bool) public executedReallocations;
    
    /// @notice Nonce for each department address (prevents replay attacks)
    mapping(address => uint256) public nonces;
    
    /// @notice Maximum execution delay after signatures (7 days)
    uint256 public constant MAX_EXECUTION_DELAY = 7 days;
    
    /// @notice Emergency pause state
    bool public paused;
    
    // ==================== EIP-712 TYPE HASH ====================
    
    /**
     * @notice EIP-712 typehash for Reallocation struct
     * @dev keccak256("Reallocation(address fromDept,address toDept,uint256 amount,uint256 nonce,uint256 deadline)")
     */
    bytes32 public constant REALLOCATION_TYPEHASH = keccak256(
        "Reallocation(address fromDept,address toDept,uint256 amount,uint256 nonce,uint256 deadline)"
    );
    
    // ==================== STRUCTS ====================
    
    /**
     * @notice Reallocation request structure
     * @param fromDept Source department address
     * @param toDept Destination department address
     * @param amount Amount to reallocate (in wei)
     * @param nonce Unique nonce for replay protection
     * @param deadline Latest timestamp for execution
     */
    struct Reallocation {
        address fromDept;
        address toDept;
        uint256 amount;
        uint256 nonce;
        uint256 deadline;
    }
    
    // ==================== EVENTS ====================
    
    /**
     * @notice Emitted when a reallocation is executed
     * @param fromDept Source department
     * @param toDept Destination department
     * @param amount Amount reallocated
     * @param nonce Nonce used
     * @param signers Addresses that signed this reallocation
     * @param executor Address that executed the transaction
     */
    event ReallocationExecuted(
        address indexed fromDept,
        address indexed toDept,
        uint256 amount,
        uint256 nonce,
        address[] signers,
        address indexed executor
    );
    
    /**
     * @notice Emitted when a governor is added
     * @param governor Address of new governor
     */
    event GovernorAdded(address indexed governor);
    
    /**
     * @notice Emitted when a governor is removed
     * @param governor Address of removed governor
     */
    event GovernorRemoved(address indexed governor);
    
    /**
     * @notice Emitted when signature threshold is updated
     * @param oldThreshold Previous threshold
     * @param newThreshold New threshold
     */
    event SignatureThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    
    /**
     * @notice Emitted when pause state changes
     */
    event PauseStateChanged(bool isPaused);
    
    // ==================== ERRORS ====================
    
    error ContractPaused();
    error InsufficientSignatures();
    error InvalidSignature();
    error DuplicateSignature();
    error UnauthorizedSigner();
    error ReallocationAlreadyExecuted();
    error DeadlineExpired();
    error InvalidNonce();
    error InvalidDepartmentAddress();
    error InvalidAmount();
    error InsufficientBalance();
    error InvalidThreshold();
    error GovernorAlreadyExists();
    error GovernorDoesNotExist();
    error InvalidGovernorAddress();
    
    // ==================== MODIFIERS ====================
    
    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }
    
    // ==================== CONSTRUCTOR ====================
    
    /**
     * @notice Initialize the MultiSigReallocation contract
     * @param _admin Address to be granted admin role
     * @param _initialGovernors Array of initial governor addresses
     * @param _requiredSignatures Number of required signatures (M in M-of-N)
     */
    constructor(
        address _admin,
        address[] memory _initialGovernors,
        uint256 _requiredSignatures
    ) EIP712("GovTech MultiSig Reallocation", "1") {
        
        if (_requiredSignatures > _initialGovernors.length || _requiredSignatures == 0) {
            revert InvalidThreshold();
        }
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        
        // Add initial governors
        for (uint256 i = 0; i < _initialGovernors.length; i++) {
            address governor = _initialGovernors[i];
            if (governor == address(0)) revert InvalidGovernorAddress();
            if (isGovernor[governor]) revert GovernorAlreadyExists();
            
            isGovernor[governor] = true;
            governors.push(governor);
            _grantRole(GOVERNANCE_ROLE, governor);
        }
        
        totalGovernors = _initialGovernors.length;
        requiredSignatures = _requiredSignatures;
    }
    
    // ==================== CORE FUNCTIONS ====================
    
    /**
     * @notice Execute a fund reallocation with multi-sig approval
     * @dev Verifies EIP-712 signatures and executes transfer
     * @param _reallocation Reallocation struct containing transfer details
     * @param _signatures Array of signatures from governors (at least M signatures)
     * 
     * Security:
     * - EIP-712 prevents cross-chain/cross-contract replay
     * - Nonce prevents same-chain replay
     * - Deadline prevents indefinite signature validity
     * - Signature verification ensures governance approval
     * - Duplicate detection prevents signature reuse
     * - ReentrancyGuard prevents reentrancy
     * 
     * Gas Optimization:
     * - Early validation checks minimize wasted computation
     * - Signature verification before state changes
     * - Single SSTORE for execution tracking
     */
    function executeReallocation(
        Reallocation calldata _reallocation,
        bytes[] calldata _signatures
    ) 
        external 
        whenNotPaused
        nonReentrant
    {
        // Validation checks
        if (_signatures.length < requiredSignatures) revert InsufficientSignatures();
        if (_reallocation.fromDept == address(0) || _reallocation.toDept == address(0)) {
            revert InvalidDepartmentAddress();
        }
        if (_reallocation.amount == 0) revert InvalidAmount();
        if (block.timestamp > _reallocation.deadline) revert DeadlineExpired();
        if (_reallocation.nonce != nonces[_reallocation.fromDept]) revert InvalidNonce();
        
        // Check balance
        if (address(this).balance < _reallocation.amount) revert InsufficientBalance();
        
        // Compute EIP-712 digest
        bytes32 structHash = keccak256(
            abi.encode(
                REALLOCATION_TYPEHASH,
                _reallocation.fromDept,
                _reallocation.toDept,
                _reallocation.amount,
                _reallocation.nonce,
                _reallocation.deadline
            )
        );
        
        bytes32 digest = _hashTypedDataV4(structHash);
        
        // Check if already executed
        if (executedReallocations[digest]) revert ReallocationAlreadyExecuted();
        
        // Verify signatures
        address[] memory signers = new address[](_signatures.length);
        
        for (uint256 i = 0; i < _signatures.length; i++) {
            address signer = digest.recover(_signatures[i]);
            
            // Verify signer is a governor
            if (!isGovernor[signer]) revert UnauthorizedSigner();
            
            // Check for duplicate signatures
            for (uint256 j = 0; j < i; j++) {
                if (signers[j] == signer) revert DuplicateSignature();
            }
            
            signers[i] = signer;
        }
        
        // Mark as executed
        executedReallocations[digest] = true;
        
        // Increment nonce to prevent replay
        nonces[_reallocation.fromDept]++;
        
        // Execute transfer
        (bool success, ) = _reallocation.toDept.call{value: _reallocation.amount}("");
        require(success, "Transfer failed");
        
        emit ReallocationExecuted(
            _reallocation.fromDept,
            _reallocation.toDept,
            _reallocation.amount,
            _reallocation.nonce,
            signers,
            msg.sender
        );
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    /**
     * @notice Get the EIP-712 domain separator
     * @return Domain separator hash
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
    
    /**
     * @notice Compute the digest for a reallocation (for off-chain signing)
     * @param _reallocation Reallocation struct
     * @return digest EIP-712 digest ready for signing
     */
    function getReallocationDigest(Reallocation calldata _reallocation) 
        external 
        view 
        returns (bytes32 digest) 
    {
        bytes32 structHash = keccak256(
            abi.encode(
                REALLOCATION_TYPEHASH,
                _reallocation.fromDept,
                _reallocation.toDept,
                _reallocation.amount,
                _reallocation.nonce,
                _reallocation.deadline
            )
        );
        
        digest = _hashTypedDataV4(structHash);
    }
    
    /**
     * @notice Get current nonce for a department
     * @param _department Department address
     * @return Current nonce
     */
    function getNonce(address _department) external view returns (uint256) {
        return nonces[_department];
    }
    
    /**
     * @notice Check if a reallocation has been executed
     * @param _digest EIP-712 digest of the reallocation
     * @return True if executed
     */
    function isExecuted(bytes32 _digest) external view returns (bool) {
        return executedReallocations[_digest];
    }
    
    /**
     * @notice Get all governors
     * @return Array of governor addresses
     */
    function getGovernors() external view returns (address[] memory) {
        return governors;
    }
    
    /**
     * @notice Get total number of governors
     * @return Total governors
     */
    function getTotalGovernors() external view returns (uint256) {
        return totalGovernors;
    }
    
    /**
     * @notice Get required signature threshold
     * @return Required signatures
     */
    function getRequiredSignatures() external view returns (uint256) {
        return requiredSignatures;
    }
    
    // ==================== ADMIN FUNCTIONS ====================
    
    /**
     * @notice Add a new governor
     * @param _governor Address to add as governor
     */
    function addGovernor(address _governor) external onlyRole(ADMIN_ROLE) {
        if (_governor == address(0)) revert InvalidGovernorAddress();
        if (isGovernor[_governor]) revert GovernorAlreadyExists();
        
        isGovernor[_governor] = true;
        governors.push(_governor);
        totalGovernors++;
        
        _grantRole(GOVERNANCE_ROLE, _governor);
        
        emit GovernorAdded(_governor);
    }
    
    /**
     * @notice Remove a governor
     * @param _governor Address to remove
     */
    function removeGovernor(address _governor) external onlyRole(ADMIN_ROLE) {
        if (!isGovernor[_governor]) revert GovernorDoesNotExist();
        
        // Ensure we maintain enough governors for threshold
        if (totalGovernors - 1 < requiredSignatures) revert InvalidThreshold();
        
        isGovernor[_governor] = false;
        
        // Remove from array
        for (uint256 i = 0; i < governors.length; i++) {
            if (governors[i] == _governor) {
                governors[i] = governors[governors.length - 1];
                governors.pop();
                break;
            }
        }
        
        totalGovernors--;
        
        _revokeRole(GOVERNANCE_ROLE, _governor);
        
        emit GovernorRemoved(_governor);
    }
    
    /**
     * @notice Update signature threshold
     * @param _newThreshold New required signatures
     */
    function setSignatureThreshold(uint256 _newThreshold) external onlyRole(ADMIN_ROLE) {
        if (_newThreshold == 0 || _newThreshold > totalGovernors) {
            revert InvalidThreshold();
        }
        
        uint256 oldThreshold = requiredSignatures;
        requiredSignatures = _newThreshold;
        
        emit SignatureThresholdUpdated(oldThreshold, _newThreshold);
    }
    
    /**
     * @notice Emergency pause
     */
    function setPaused(bool _paused) external onlyRole(ADMIN_ROLE) {
        paused = _paused;
        emit PauseStateChanged(_paused);
    }
    
    /**
     * @notice Receive ETH deposits
     */
    receive() external payable {}
    
    /**
     * @notice Fallback to receive ETH
     */
    fallback() external payable {}
}
