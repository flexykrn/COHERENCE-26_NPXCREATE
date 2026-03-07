// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CommitmentRegistry
 * @notice Anti-backdating mechanism using commit-reveal pattern for budget allocations
 * @dev Prevents retroactive budget manipulation by requiring cryptographic commitment before spending
 * 
 * Security Considerations:
 * - Commit-reveal prevents front-running and retroactive changes
 * - Time-lock enforces minimum commit period (prevents instant reveal)
 * - Hash verification ensures data integrity
 * - Role-based access prevents unauthorized commitments
 * - Nonce prevents replay attacks
 */
contract CommitmentRegistry is AccessControl, ReentrancyGuard {
    
    // ==================== ROLES ====================
    
    /// @notice Role for authorized departments that can commit budgets
    bytes32 public constant DEPARTMENT_ROLE = keccak256("DEPARTMENT_ROLE");
    
    /// @notice Role for admin operations
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // ==================== STATE VARIABLES ====================
    
    /// @notice Minimum time between commit and reveal (prevents instant reveals)
    uint256 public constant MIN_COMMIT_PERIOD = 1 hours;
    
    /// @notice Maximum time to reveal after commit (prevents indefinite locks)
    uint256 public constant MAX_REVEAL_PERIOD = 30 days;
    
    /// @notice Counter for commitment IDs
    uint256 public commitmentCount;
    
    /// @notice Mapping from commitment ID to commitment data
    mapping(uint256 => Commitment) public commitments;
    
    /// @notice Mapping from department address to their commitment IDs
    mapping(address => uint256[]) public departmentCommitments;
    
    /// @notice Mapping to track used nonces per department (prevents replay)
    mapping(address => mapping(uint256 => bool)) public usedNonces;
    
    /// @notice Emergency pause state
    bool public paused;
    
    // ==================== STRUCTS ====================
    
    /**
     * @notice Commitment structure for budget allocation
     * @param budgetHash Keccak256 hash of (amount, details, nonce)
     * @param department Address of the committing department
     * @param commitTime Timestamp when commitment was made
     * @param revealTime Timestamp when commitment was revealed (0 if not revealed)
     * @param isRevealed Whether the commitment has been revealed
     * @param amount Revealed budget amount (0 until revealed)
     * @param details Revealed budget details (empty until revealed)
     */
    struct Commitment {
        bytes32 budgetHash;
        address department;
        uint256 commitTime;
        uint256 revealTime;
        bool isRevealed;
        uint256 amount;
        string details;
    }
    
    // ==================== EVENTS ====================
    
    /**
     * @notice Emitted when a department commits to a budget hash
     * @param commitmentId Unique ID for this commitment
     * @param department Address of the committing department
     * @param budgetHash The committed hash
     * @param commitTime Timestamp of commitment
     */
    event BudgetCommitted(
        uint256 indexed commitmentId,
        address indexed department,
        bytes32 indexed budgetHash,
        uint256 commitTime
    );
    
    /**
     * @notice Emitted when a commitment is revealed
     * @param commitmentId ID of the revealed commitment
     * @param department Department that revealed
     * @param amount Revealed budget amount
     * @param details Revealed budget details
     * @param revealTime Timestamp of reveal
     */
    event BudgetRevealed(
        uint256 indexed commitmentId,
        address indexed department,
        uint256 amount,
        string details,
        uint256 revealTime
    );
    
    /**
     * @notice Emitted when a commitment expires without being revealed
     * @param commitmentId ID of expired commitment
     */
    event CommitmentExpired(uint256 indexed commitmentId);
    
    /**
     * @notice Emitted when pause state changes
     */
    event PauseStateChanged(bool isPaused);
    
    // ==================== ERRORS ====================
    
    error ContractPaused();
    error UnauthorizedDepartment();
    error CommitmentAlreadyRevealed();
    error CommitPeriodNotElapsed();
    error CommitmentAlreadyExpired(); // Renamed to avoid conflict with event
    error InvalidRevealData();
    error NonceAlreadyUsed();
    error CommitmentDoesNotExist();
    error InvalidCommitmentHash();
    
    // ==================== MODIFIERS ====================
    
    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }
    
    // ==================== CONSTRUCTOR ====================
    
    /**
     * @notice Initialize the CommitmentRegistry
     * @param _admin Address to be granted admin role
     */
    constructor(address _admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
    }
    
    // ==================== CORE FUNCTIONS ====================
    
    /**
     * @notice Commit to a budget allocation hash
     * @dev Department must reveal the preimage within MAX_REVEAL_PERIOD
     * @param _budgetHash Keccak256 hash of abi.encodePacked(amount, details, nonce)
     * @return commitmentId Unique ID for this commitment
     * 
     * Security:
     * - Only authorized departments can commit
     * - Hash commitment prevents retroactive changes
     * - Time-bound commitment prevents indefinite locks
     * - Nonce requirement prevents replay attacks
     * 
     * Gas Optimization:
     * - Uses unchecked increment for commitmentCount
     * - Single SSTORE for commitment struct
     * - Array push is gas-optimized by compiler
     */
    function commitBudget(bytes32 _budgetHash) 
        external 
        whenNotPaused
        onlyRole(DEPARTMENT_ROLE)
        returns (uint256 commitmentId)
    {
        if (_budgetHash == bytes32(0)) revert InvalidCommitmentHash();
        
        commitmentId = commitmentCount;
        
        commitments[commitmentId] = Commitment({
            budgetHash: _budgetHash,
            department: msg.sender,
            commitTime: block.timestamp,
            revealTime: 0,
            isRevealed: false,
            amount: 0,
            details: ""
        });
        
        departmentCommitments[msg.sender].push(commitmentId);
        
        unchecked {
            ++commitmentCount;
        }
        
        emit BudgetCommitted(commitmentId, msg.sender, _budgetHash, block.timestamp);
    }
    
    /**
     * @notice Reveal a previously committed budget
     * @dev Verifies that revealed data matches the committed hash
     * @param _commitmentId ID of the commitment to reveal
     * @param _amount Budget amount in wei or smallest token unit
     * @param _details Human-readable budget details (e.g., "Q1 Infrastructure - Road Repairs District 5")
     * @param _nonce Random nonce used in the original hash
     * 
     * Security:
     * - Hash verification prevents data manipulation
     * - Time-lock ensures minimum commit period elapsed
     * - Expiry check prevents stale reveals
     * - Nonce tracking prevents replay attacks
     * - Only committing department can reveal
     * 
     * Gas Optimization:
     * - Early revert checks minimize computation
     * - Hash computation done locally (not stored)
     * - Single SSTORE update for commitment
     */
    function revealBudget(
        uint256 _commitmentId,
        uint256 _amount,
        string calldata _details,
        uint256 _nonce
    ) 
        external 
        whenNotPaused
        nonReentrant
    {
        Commitment storage commitment = commitments[_commitmentId];
        
        // Validation checks
        if (commitment.commitTime == 0) revert CommitmentDoesNotExist();
        if (commitment.department != msg.sender) revert UnauthorizedDepartment();
        if (commitment.isRevealed) revert CommitmentAlreadyRevealed();
        
        // Time-bound checks
        if (block.timestamp < commitment.commitTime + MIN_COMMIT_PERIOD) {
            revert CommitPeriodNotElapsed();
        }
        if (block.timestamp > commitment.commitTime + MAX_REVEAL_PERIOD) {
            revert CommitmentAlreadyExpired();
        }
        
        // Prevent nonce reuse
        if (usedNonces[msg.sender][_nonce]) revert NonceAlreadyUsed();
        
        // Verify revealed data matches committed hash
        bytes32 computedHash = keccak256(abi.encodePacked(_amount, _details, _nonce));
        if (computedHash != commitment.budgetHash) revert InvalidRevealData();
        
        // Update commitment state
        commitment.isRevealed = true;
        commitment.revealTime = block.timestamp;
        commitment.amount = _amount;
        commitment.details = _details;
        
        // Mark nonce as used
        usedNonces[msg.sender][_nonce] = true;
        
        emit BudgetRevealed(_commitmentId, msg.sender, _amount, _details, block.timestamp);
    }
    
    /**
     * @notice Mark an expired commitment (callable by anyone after MAX_REVEAL_PERIOD)
     * @param _commitmentId ID of the commitment to expire
     * 
     * Security:
     * - Anyone can call to clean up expired commitments
     * - Prevents indefinite lock of commitment slots
     */
    function expireCommitment(uint256 _commitmentId) external {
        Commitment storage commitment = commitments[_commitmentId];
        
        if (commitment.commitTime == 0) revert CommitmentDoesNotExist();
        if (commitment.isRevealed) revert CommitmentAlreadyRevealed();
        if (block.timestamp <= commitment.commitTime + MAX_REVEAL_PERIOD) {
            revert CommitmentAlreadyExpired();
        }
        
        // Mark as revealed with zero values (prevents further reveals)
        commitment.isRevealed = true;
        commitment.revealTime = block.timestamp;
        
        emit CommitmentExpired(_commitmentId);
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    /**
     * @notice Get commitment details
     * @param _commitmentId ID of the commitment
     * @return Commitment struct
     */
    function getCommitment(uint256 _commitmentId) external view returns (Commitment memory) {
        return commitments[_commitmentId];
    }
    
    /**
     * @notice Get all commitment IDs for a department
     * @param _department Department address
     * @return Array of commitment IDs
     */
    function getDepartmentCommitments(address _department) external view returns (uint256[] memory) {
        return departmentCommitments[_department];
    }
    
    /**
     * @notice Check if commitment is valid and within reveal period
     * @param _commitmentId ID of the commitment
     * @return valid True if commitment can still be revealed
     */
    function isCommitmentValid(uint256 _commitmentId) external view returns (bool valid) {
        Commitment storage commitment = commitments[_commitmentId];
        
        if (commitment.commitTime == 0) return false;
        if (commitment.isRevealed) return false;
        if (block.timestamp < commitment.commitTime + MIN_COMMIT_PERIOD) return false;
        if (block.timestamp > commitment.commitTime + MAX_REVEAL_PERIOD) return false;
        
        return true;
    }
    
    /**
     * @notice Helper to compute budget hash off-chain (for testing)
     * @param _amount Budget amount
     * @param _details Budget details
     * @param _nonce Random nonce
     * @return Hash to be used in commitBudget
     */
    function computeBudgetHash(
        uint256 _amount,
        string calldata _details,
        uint256 _nonce
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(_amount, _details, _nonce));
    }
    
    // ==================== ADMIN FUNCTIONS ====================
    
    /**
     * @notice Grant department role to an address
     * @param _department Address to grant role to
     */
    function addDepartment(address _department) external onlyRole(ADMIN_ROLE) {
        grantRole(DEPARTMENT_ROLE, _department);
    }
    
    /**
     * @notice Revoke department role from an address
     * @param _department Address to revoke role from
     */
    function removeDepartment(address _department) external onlyRole(ADMIN_ROLE) {
        revokeRole(DEPARTMENT_ROLE, _department);
    }
    
    /**
     * @notice Emergency pause
     */
    function setPaused(bool _paused) external onlyRole(ADMIN_ROLE) {
        paused = _paused;
        emit PauseStateChanged(_paused);
    }
}
