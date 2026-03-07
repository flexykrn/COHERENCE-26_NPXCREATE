// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";

/**
 * @title AuditVRF
 * @notice Provably fair random audit selection using Chainlink VRF
 * @dev Selects departments or batches for mandatory audits using verifiable randomness
 * 
 * Security Considerations:
 * - Chainlink VRF provides cryptographic proof of randomness
 * - VRF prevents manipulation of audit selection
 * - Role-based access for audit triggering
 * - Cooldown period prevents audit spam
 * - Audit history tracking for compliance
 */
contract AuditVRF is AccessControl, VRFConsumerBaseV2 {
    
    // ==================== ROLES ====================
    
    /// @notice Role for triggering audits
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    
    /// @notice Role for admin operations
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // ==================== CHAINLINK VRF VARIABLES ====================
    
    /// @notice Chainlink VRF Coordinator interface
    VRFCoordinatorV2Interface public immutable COORDINATOR;
    
    /// @notice Subscription ID for Chainlink VRF
    uint64 public subscriptionId;
    
    /// @notice Key hash for Chainlink VRF (gas lane)
    bytes32 public keyHash;
    
    /// @notice Callback gas limit for fulfillRandomWords
    uint32 public callbackGasLimit = 200000;
    
    /// @notice Number of block confirmations for VRF
    uint16 public requestConfirmations = 3;
    
    /// @notice Number of random words to request
    uint32 public numWords = 1;
    
    // ==================== STATE VARIABLES ====================
    
    /// @notice Total number of batches in the system (updated externally)
    uint256 public totalBatches;
    
    /// @notice Total number of departments in the system
    uint256 public totalDepartments;
    
    /// @notice Minimum cooldown between audit requests (prevents spam)
    uint256 public constant AUDIT_COOLDOWN = 1 days;
    
    /// @notice Last audit request timestamp
    uint256 public lastAuditTime;
    
    /// @notice Mapping from VRF request ID to audit metadata
    mapping(uint256 => AuditRequest) public auditRequests;
    
    /// @notice Mapping from batch ID to audit history
    mapping(uint256 => AuditHistory[]) public batchAudits;
    
    /// @notice Mapping from department address to audit history
    mapping(address => AuditHistory[]) public departmentAudits;
    
    /// @notice Array of registered departments
    address[] public departments;
    
    /// @notice Mapping to check if address is a department
    mapping(address => bool) public isDepartment;
    
    /// @notice Emergency pause state
    bool public paused;
    
    // ==================== STRUCTS ====================
    
    /**
     * @notice Audit request metadata
     * @param requestId VRF request ID
     * @param auditType Type of audit (0 = batch, 1 = department)
     * @param requestTime Timestamp of request
     * @param fulfilled Whether VRF request has been fulfilled
     * @param randomWord Random number from VRF
     * @param selectedTarget Selected batch ID or department index
     */
    struct AuditRequest {
        uint256 requestId;
        uint8 auditType; // 0 = batch audit, 1 = department audit
        uint256 requestTime;
        bool fulfilled;
        uint256 randomWord;
        uint256 selectedTarget;
    }
    
    /**
     * @notice Audit history entry
     * @param auditId Sequential audit ID
     * @param timestamp Audit trigger timestamp
     * @param vrfRequestId VRF request ID
     * @param randomness Random number used
     * @param auditor Address that triggered the audit
     */
    struct AuditHistory {
        uint256 auditId;
        uint256 timestamp;
        uint256 vrfRequestId;
        uint256 randomness;
        address auditor;
    }
    
    // ==================== EVENTS ====================
    
    /**
     * @notice Emitted when a random audit is requested
     * @param requestId VRF request ID
     * @param auditType Type of audit (batch/department)
     * @param auditor Address that requested audit
     */
    event RandomAuditRequested(
        uint256 indexed requestId,
        uint8 auditType,
        address indexed auditor
    );
    
    /**
     * @notice Emitted when an audit target is selected
     * @param requestId VRF request ID
     * @param auditType Type of audit
     * @param targetId Selected batch ID or department index
     * @param randomness Random number used
     */
    event AuditTriggered(
        uint256 indexed requestId,
        uint8 auditType,
        uint256 indexed targetId,
        uint256 randomness
    );
    
    /**
     * @notice Emitted when a department is registered
     * @param department Department address
     * @param index Department index
     */
    event DepartmentRegistered(address indexed department, uint256 index);
    
    /**
     * @notice Emitted when a department is removed
     * @param department Department address
     */
    event DepartmentRemoved(address indexed department);
    
    /**
     * @notice Emitted when total batches is updated
     * @param newTotal New total batch count
     */
    event TotalBatchesUpdated(uint256 newTotal);
    
    /**
     * @notice Emitted when pause state changes
     */
    event PauseStateChanged(bool isPaused);
    
    // ==================== ERRORS ====================
    
    error ContractPaused();
    error AuditCooldownNotElapsed();
    error NoBatchesAvailable();
    error NoDepartmentsRegistered();
    error InvalidAuditType();
    error DepartmentAlreadyRegistered();
    error DepartmentNotRegistered();
    error InvalidDepartmentAddress();
    error RequestNotFound();
    error RequestAlreadyFulfilled();
    
    // ==================== MODIFIERS ====================
    
    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }
    
    // ==================== CONSTRUCTOR ====================
    
    /**
     * @notice Initialize the AuditVRF contract
     * @param _admin Address to be granted admin role
     * @param _vrfCoordinator Chainlink VRF Coordinator address
     * @param _subscriptionId Chainlink VRF subscription ID
     * @param _keyHash Gas lane key hash
     */
    constructor(
        address _admin,
        address _vrfCoordinator,
        uint64 _subscriptionId,
        bytes32 _keyHash
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(AUDITOR_ROLE, _admin);
    }
    
    // ==================== CORE FUNCTIONS ====================
    
    /**
     * @notice Request a random audit selection
     * @dev Uses Chainlink VRF to get verifiable random number
     * @param _auditType Type of audit (0 = batch, 1 = department)
     * @return requestId VRF request ID
     * 
     * Security:
     * - Cooldown period prevents spam
     * - VRF ensures unpredictable selection
     * - Role-based access control
     * - Validates audit type and data availability
     * 
     * Gas Optimization:
     * - Early validation checks
     * - Single VRF request for one random word
     */
    function requestRandomAudit(uint8 _auditType) 
        external 
        whenNotPaused
        onlyRole(AUDITOR_ROLE)
        returns (uint256 requestId)
    {
        // Cooldown check
        if (block.timestamp < lastAuditTime + AUDIT_COOLDOWN) {
            revert AuditCooldownNotElapsed();
        }
        
        // Validate audit type and data availability
        if (_auditType == 0) {
            // Batch audit
            if (totalBatches == 0) revert NoBatchesAvailable();
        } else if (_auditType == 1) {
            // Department audit
            if (totalDepartments == 0) revert NoDepartmentsRegistered();
        } else {
            revert InvalidAuditType();
        }
        
        // Request randomness from Chainlink VRF
        requestId = COORDINATOR.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        
        // Store audit request metadata
        auditRequests[requestId] = AuditRequest({
            requestId: requestId,
            auditType: _auditType,
            requestTime: block.timestamp,
            fulfilled: false,
            randomWord: 0,
            selectedTarget: 0
        });
        
        lastAuditTime = block.timestamp;
        
        emit RandomAuditRequested(requestId, _auditType, msg.sender);
    }
    
    /**
     * @notice Callback function for Chainlink VRF
     * @dev Called by VRF Coordinator with random number
     * @param _requestId VRF request ID
     * @param _randomWords Array of random numbers
     * 
     * Security:
     * - Only callable by VRF Coordinator
     * - Validates request exists
     * - Modulo operation ensures valid selection
     * - Records audit history for compliance
     */
    function fulfillRandomWords(
        uint256 _requestId,
        uint256[] memory _randomWords
    ) internal override {
        AuditRequest storage request = auditRequests[_requestId];
        
        if (request.requestTime == 0) revert RequestNotFound();
        if (request.fulfilled) revert RequestAlreadyFulfilled();
        
        uint256 randomWord = _randomWords[0];
        uint256 selectedTarget;
        
        // Select target based on audit type
        if (request.auditType == 0) {
            // Batch audit - select random batch ID
            selectedTarget = randomWord % totalBatches;
            
            // Record audit history for batch
            batchAudits[selectedTarget].push(AuditHistory({
                auditId: batchAudits[selectedTarget].length,
                timestamp: block.timestamp,
                vrfRequestId: _requestId,
                randomness: randomWord,
                auditor: tx.origin // Original caller who triggered the audit
            }));
            
        } else {
            // Department audit - select random department index
            selectedTarget = randomWord % totalDepartments;
            address selectedDept = departments[selectedTarget];
            
            // Record audit history for department
            departmentAudits[selectedDept].push(AuditHistory({
                auditId: departmentAudits[selectedDept].length,
                timestamp: block.timestamp,
                vrfRequestId: _requestId,
                randomness: randomWord,
                auditor: tx.origin
            }));
        }
        
        // Update request
        request.fulfilled = true;
        request.randomWord = randomWord;
        request.selectedTarget = selectedTarget;
        
        emit AuditTriggered(_requestId, request.auditType, selectedTarget, randomWord);
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    /**
     * @notice Get audit request details
     * @param _requestId VRF request ID
     * @return AuditRequest struct
     */
    function getAuditRequest(uint256 _requestId) external view returns (AuditRequest memory) {
        return auditRequests[_requestId];
    }
    
    /**
     * @notice Get audit history for a batch
     * @param _batchId Batch ID
     * @return Array of audit history entries
     */
    function getBatchAuditHistory(uint256 _batchId) external view returns (AuditHistory[] memory) {
        return batchAudits[_batchId];
    }
    
    /**
     * @notice Get audit history for a department
     * @param _department Department address
     * @return Array of audit history entries
     */
    function getDepartmentAuditHistory(address _department) external view returns (AuditHistory[] memory) {
        return departmentAudits[_department];
    }
    
    /**
     * @notice Get all registered departments
     * @return Array of department addresses
     */
    function getDepartments() external view returns (address[] memory) {
        return departments;
    }
    
    /**
     * @notice Get total number of departments
     * @return Total departments
     */
    function getTotalDepartments() external view returns (uint256) {
        return totalDepartments;
    }
    
    /**
     * @notice Get total number of batches
     * @return Total batches
     */
    function getTotalBatches() external view returns (uint256) {
        return totalBatches;
    }
    
    /**
     * @notice Check if cooldown has elapsed
     * @return True if new audit can be requested
     */
    function canRequestAudit() external view returns (bool) {
        return block.timestamp >= lastAuditTime + AUDIT_COOLDOWN;
    }
    
    // ==================== ADMIN FUNCTIONS ====================
    
    /**
     * @notice Register a new department for audit selection
     * @param _department Department address
     */
    function registerDepartment(address _department) external onlyRole(ADMIN_ROLE) {
        if (_department == address(0)) revert InvalidDepartmentAddress();
        if (isDepartment[_department]) revert DepartmentAlreadyRegistered();
        
        isDepartment[_department] = true;
        departments.push(_department);
        totalDepartments++;
        
        emit DepartmentRegistered(_department, departments.length - 1);
    }
    
    /**
     * @notice Remove a department from audit pool
     * @param _department Department address
     */
    function removeDepartment(address _department) external onlyRole(ADMIN_ROLE) {
        if (!isDepartment[_department]) revert DepartmentNotRegistered();
        
        isDepartment[_department] = false;
        
        // Remove from array
        for (uint256 i = 0; i < departments.length; i++) {
            if (departments[i] == _department) {
                departments[i] = departments[departments.length - 1];
                departments.pop();
                break;
            }
        }
        
        totalDepartments--;
        
        emit DepartmentRemoved(_department);
    }
    
    /**
     * @notice Update total batches count (called by MerkleRegistry)
     * @param _newTotal New total batch count
     */
    function updateTotalBatches(uint256 _newTotal) external onlyRole(ADMIN_ROLE) {
        totalBatches = _newTotal;
        emit TotalBatchesUpdated(_newTotal);
    }
    
    /**
     * @notice Update VRF parameters
     * @param _keyHash New key hash
     * @param _callbackGasLimit New callback gas limit
     * @param _requestConfirmations New confirmation count
     */
    function updateVRFConfig(
        bytes32 _keyHash,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations
    ) external onlyRole(ADMIN_ROLE) {
        keyHash = _keyHash;
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
    }
    
    /**
     * @notice Update subscription ID
     * @param _subscriptionId New subscription ID
     */
    function updateSubscription(uint64 _subscriptionId) external onlyRole(ADMIN_ROLE) {
        subscriptionId = _subscriptionId;
    }
    
    /**
     * @notice Grant auditor role to an address
     * @param _auditor Address to grant role to
     */
    function addAuditor(address _auditor) external onlyRole(ADMIN_ROLE) {
        grantRole(AUDITOR_ROLE, _auditor);
    }
    
    /**
     * @notice Revoke auditor role from an address
     * @param _auditor Address to revoke role from
     */
    function removeAuditor(address _auditor) external onlyRole(ADMIN_ROLE) {
        revokeRole(AUDITOR_ROLE, _auditor);
    }
    
    /**
     * @notice Emergency pause
     */
    function setPaused(bool _paused) external onlyRole(ADMIN_ROLE) {
        paused = _paused;
        emit PauseStateChanged(_paused);
    }
}
