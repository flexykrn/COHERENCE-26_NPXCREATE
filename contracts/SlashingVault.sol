// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SlashingVault
 * @notice Economic security mechanism requiring nodes/auditors to stake funds
 * @dev Penalizes malicious actors by slashing stakes and rewards honest participation
 * 
 * Security Considerations:
 * - ReentrancyGuard prevents reentrancy attacks during stake/withdraw
 * - Time-lock on withdrawals prevents instant exit after fraud
 * - Role-based slashing prevents unauthorized penalties
 * - Minimum stake requirements prevent Sybil attacks
 * - Cooldown period prevents flash loan staking attacks
 */
contract SlashingVault is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ==================== ROLES ====================
    
    /// @notice Role for executing slashing (fraud proof verifiers, DAO governance)
    bytes32 public constant SLASHER_ROLE = keccak256("SLASHER_ROLE");
    
    /// @notice Role for admin operations
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // ==================== STATE VARIABLES ====================
    
    /// @notice Minimum stake required to participate (prevents dust staking)
    uint256 public minimumStake = 1 ether;
    
    /// @notice Withdrawal cooldown period (prevents instant exit after fraud)
    uint256 public constant WITHDRAWAL_DELAY = 7 days;
    
    /// @notice Maximum slash percentage (50% of stake)
    uint256 public constant MAX_SLASH_PERCENTAGE = 50;
    
    /// @notice Treasury address for slashed funds
    address public treasury;
    
    /// @notice Burn address for slashed funds (if not sent to treasury)
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    
    /// @notice Total staked amount across all stakers
    uint256 public totalStaked;
    
    /// @notice Total slashed amount (historical record)
    uint256 public totalSlashed;
    
    /// @notice Mapping of staker address to stake info
    mapping(address => StakeInfo) public stakes;
    
    /// @notice Mapping of pending withdrawals
    mapping(address => WithdrawalRequest) public pendingWithdrawals;
    
    /// @notice Emergency pause state
    bool public paused;
    
    // ==================== STRUCTS ====================
    
    /**
     * @notice Stake information for each participant
     * @param amount Total amount staked
     * @param stakedAt Timestamp when first staked
     * @param lastSlashTime Timestamp of last slash (for cooldown)
     * @param slashCount Number of times this staker has been slashed
     */
    struct StakeInfo {
        uint256 amount;
        uint256 stakedAt;
        uint256 lastSlashTime;
        uint256 slashCount;
    }
    
    /**
     * @notice Withdrawal request structure
     * @param amount Amount requested to withdraw
     * @param requestTime Timestamp of withdrawal request
     * @param isPending Whether withdrawal is pending
     */
    struct WithdrawalRequest {
        uint256 amount;
        uint256 requestTime;
        bool isPending;
    }
    
    // ==================== EVENTS ====================
    
    /**
     * @notice Emitted when a user stakes funds
     * @param staker Address of the staker
     * @param amount Amount staked
     * @param totalStake Total stake for this user
     * @param timestamp Stake timestamp
     */
    event Staked(
        address indexed staker,
        uint256 amount,
        uint256 totalStake,
        uint256 timestamp
    );
    
    /**
     * @notice Emitted when withdrawal is requested
     * @param staker Address requesting withdrawal
     * @param amount Amount to withdraw
     * @param availableAt Timestamp when withdrawal becomes available
     */
    event WithdrawalRequested(
        address indexed staker,
        uint256 amount,
        uint256 availableAt
    );
    
    /**
     * @notice Emitted when withdrawal is executed
     * @param staker Address that withdrew
     * @param amount Amount withdrawn
     */
    event Withdrawn(
        address indexed staker,
        uint256 amount
    );
    
    /**
     * @notice Emitted when a stake is slashed
     * @param badActor Address that was slashed
     * @param penaltyAmount Amount slashed
     * @param remainingStake Remaining stake after slash
     * @param reason Reason for slashing
     * @param slashedBy Address that executed the slash
     */
    event Slashed(
        address indexed badActor,
        uint256 penaltyAmount,
        uint256 remainingStake,
        string reason,
        address indexed slashedBy
    );
    
    /**
     * @notice Emitted when slashed funds are distributed
     * @param amount Amount distributed
     * @param recipient Recipient address (treasury or burn)
     */
    event SlashedFundsDistributed(
        uint256 amount,
        address indexed recipient
    );
    
    /**
     * @notice Emitted when pause state changes
     */
    event PauseStateChanged(bool isPaused);
    
    /**
     * @notice Emitted when minimum stake is updated
     */
    event MinimumStakeUpdated(uint256 oldMinimum, uint256 newMinimum);
    
    // ==================== ERRORS ====================
    
    error ContractPaused();
    error InsufficientStake();
    error BelowMinimumStake();
    error NoStakeToWithdraw();
    error WithdrawalAlreadyPending();
    error NoWithdrawalPending();
    error WithdrawalCooldownNotElapsed();
    error SlashAmountExceedsStake();
    error SlashPercentageTooHigh();
    error UnauthorizedSlasher();
    error InvalidTreasuryAddress();
    error InvalidAmount();
    
    // ==================== MODIFIERS ====================
    
    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }
    
    // ==================== CONSTRUCTOR ====================
    
    /**
     * @notice Initialize the SlashingVault
     * @param _admin Address to be granted admin role
     * @param _treasury Treasury address for slashed funds
     */
    constructor(address _admin, address _treasury) {
        if (_treasury == address(0)) revert InvalidTreasuryAddress();
        
        treasury = _treasury;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(SLASHER_ROLE, _admin);
    }
    
    // ==================== CORE FUNCTIONS ====================
    
    /**
     * @notice Stake native currency (ETH) to participate in network
     * @dev Minimum stake requirement prevents spam/Sybil attacks
     * 
     * Security:
     * - ReentrancyGuard prevents reentrancy during state updates
     * - Minimum stake check prevents dust staking
     * - Timestamp recording enables time-based checks
     * 
     * Gas Optimization:
     * - Single SSTORE for stake update
     * - msg.value directly added (no transfer needed)
     */
    function stake() 
        external 
        payable 
        whenNotPaused
        nonReentrant
    {
        if (msg.value == 0) revert InvalidAmount();
        
        StakeInfo storage stakeInfo = stakes[msg.sender];
        
        // If first time staking, record timestamp
        if (stakeInfo.amount == 0) {
            stakeInfo.stakedAt = block.timestamp;
        }
        
        stakeInfo.amount += msg.value;
        totalStaked += msg.value;
        
        // Ensure total stake meets minimum
        if (stakeInfo.amount < minimumStake) revert BelowMinimumStake();
        
        emit Staked(msg.sender, msg.value, stakeInfo.amount, block.timestamp);
    }
    
    /**
     * @notice Request withdrawal of staked funds
     * @dev Initiates cooldown period before actual withdrawal
     * @param _amount Amount to withdraw
     * 
     * Security:
     * - Cooldown prevents instant exit after fraud
     * - Two-step withdrawal prevents flash loan attacks
     * - Sufficient stake check prevents over-withdrawal
     */
    function requestWithdrawal(uint256 _amount) 
        external 
        whenNotPaused
        nonReentrant
    {
        StakeInfo storage stakeInfo = stakes[msg.sender];
        
        if (stakeInfo.amount < _amount) revert InsufficientStake();
        if (_amount == 0) revert InvalidAmount();
        
        WithdrawalRequest storage request = pendingWithdrawals[msg.sender];
        if (request.isPending) revert WithdrawalAlreadyPending();
        
        request.amount = _amount;
        request.requestTime = block.timestamp;
        request.isPending = true;
        
        emit WithdrawalRequested(
            msg.sender, 
            _amount, 
            block.timestamp + WITHDRAWAL_DELAY
        );
    }
    
    /**
     * @notice Execute pending withdrawal after cooldown period
     * @dev Completes the two-step withdrawal process
     * 
     * Security:
     * - Cooldown enforcement prevents instant exits
     * - ReentrancyGuard prevents reentrancy attacks
     * - State updates before transfer (CEI pattern)
     * 
     * Gas Optimization:
     * - Direct ETH transfer using call
     * - Minimal state updates
     */
    function withdraw() 
        external 
        whenNotPaused
        nonReentrant
    {
        WithdrawalRequest storage request = pendingWithdrawals[msg.sender];
        
        if (!request.isPending) revert NoWithdrawalPending();
        if (block.timestamp < request.requestTime + WITHDRAWAL_DELAY) {
            revert WithdrawalCooldownNotElapsed();
        }
        
        uint256 amount = request.amount;
        StakeInfo storage stakeInfo = stakes[msg.sender];
        
        if (stakeInfo.amount < amount) revert InsufficientStake();
        
        // Update state before transfer (CEI pattern)
        stakeInfo.amount -= amount;
        totalStaked -= amount;
        request.isPending = false;
        request.amount = 0;
        
        // Transfer funds
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "ETH transfer failed");
        
        emit Withdrawn(msg.sender, amount);
    }
    
    /**
     * @notice Slash a bad actor's stake
     * @dev Only callable by SLASHER_ROLE (fraud proof contracts, governance)
     * @param _badActor Address to slash
     * @param _penaltyAmount Amount to slash (in wei)
     * @param _reason Human-readable reason for slashing
     * @param _sendToTreasury If true, send to treasury; if false, burn
     * 
     * Security:
     * - Role-based access prevents unauthorized slashing
     * - Maximum slash percentage prevents complete stake wipeout
     * - Slash tracking enables pattern detection
     * - ReentrancyGuard prevents reentrancy
     * 
     * Gas Optimization:
     * - Single SSTORE for stake update
     * - Conditional treasury transfer
     */
    function slash(
        address _badActor,
        uint256 _penaltyAmount,
        string calldata _reason,
        bool _sendToTreasury
    ) 
        external 
        whenNotPaused
        nonReentrant
        onlyRole(SLASHER_ROLE)
    {
        StakeInfo storage stakeInfo = stakes[_badActor];
        
        if (_penaltyAmount > stakeInfo.amount) revert SlashAmountExceedsStake();
        
        // Ensure slash doesn't exceed maximum percentage
        uint256 maxSlash = (stakeInfo.amount * MAX_SLASH_PERCENTAGE) / 100;
        if (_penaltyAmount > maxSlash) revert SlashPercentageTooHigh();
        
        // Update state
        stakeInfo.amount -= _penaltyAmount;
        stakeInfo.lastSlashTime = block.timestamp;
        stakeInfo.slashCount += 1;
        
        totalStaked -= _penaltyAmount;
        totalSlashed += _penaltyAmount;
        
        // Distribute slashed funds
        address recipient = _sendToTreasury ? treasury : BURN_ADDRESS;
        (bool success, ) = recipient.call{value: _penaltyAmount}("");
        require(success, "Slash transfer failed");
        
        emit Slashed(
            _badActor,
            _penaltyAmount,
            stakeInfo.amount,
            _reason,
            msg.sender
        );
        
        emit SlashedFundsDistributed(_penaltyAmount, recipient);
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    /**
     * @notice Get stake information for an address
     * @param _staker Address to query
     * @return StakeInfo struct
     */
    function getStakeInfo(address _staker) external view returns (StakeInfo memory) {
        return stakes[_staker];
    }
    
    /**
     * @notice Get withdrawal request information
     * @param _staker Address to query
     * @return WithdrawalRequest struct
     */
    function getWithdrawalRequest(address _staker) external view returns (WithdrawalRequest memory) {
        return pendingWithdrawals[_staker];
    }
    
    /**
     * @notice Check if withdrawal is ready to execute
     * @param _staker Address to check
     * @return ready True if withdrawal can be executed
     */
    function isWithdrawalReady(address _staker) external view returns (bool ready) {
        WithdrawalRequest storage request = pendingWithdrawals[_staker];
        return request.isPending && 
               block.timestamp >= request.requestTime + WITHDRAWAL_DELAY;
    }
    
    /**
     * @notice Get total staked amount in contract
     * @return Total staked value
     */
    function getTotalStaked() external view returns (uint256) {
        return totalStaked;
    }
    
    /**
     * @notice Get historical total slashed amount
     * @return Total slashed value
     */
    function getTotalSlashed() external view returns (uint256) {
        return totalSlashed;
    }
    
    // ==================== ADMIN FUNCTIONS ====================
    
    /**
     * @notice Update minimum stake requirement
     * @param _newMinimum New minimum stake amount
     */
    function setMinimumStake(uint256 _newMinimum) external onlyRole(ADMIN_ROLE) {
        uint256 oldMinimum = minimumStake;
        minimumStake = _newMinimum;
        emit MinimumStakeUpdated(oldMinimum, _newMinimum);
    }
    
    /**
     * @notice Update treasury address
     * @param _newTreasury New treasury address
     */
    function setTreasury(address _newTreasury) external onlyRole(ADMIN_ROLE) {
        if (_newTreasury == address(0)) revert InvalidTreasuryAddress();
        treasury = _newTreasury;
    }
    
    /**
     * @notice Emergency pause
     */
    function setPaused(bool _paused) external onlyRole(ADMIN_ROLE) {
        paused = _paused;
        emit PauseStateChanged(_paused);
    }
    
    /**
     * @notice Grant slasher role
     * @param _slasher Address to grant role to (e.g., fraud proof contract)
     */
    function addSlasher(address _slasher) external onlyRole(ADMIN_ROLE) {
        grantRole(SLASHER_ROLE, _slasher);
    }
    
    /**
     * @notice Revoke slasher role
     * @param _slasher Address to revoke role from
     */
    function removeSlasher(address _slasher) external onlyRole(ADMIN_ROLE) {
        revokeRole(SLASHER_ROLE, _slasher);
    }
    
    /**
     * @notice Fallback to receive ETH
     */
    receive() external payable {
        // Allow contract to receive ETH for staking
    }
}
