// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SlashingVault
 * @notice Staking and slashing mechanism for departmental nodes.
 *
 *         - Departmental nodes stake ETH as collateral to participate in the
 *           GovTech system.  Stake signals commitment and makes nodes
 *           accountable for misbehaviour.
 *         - The admin (owner) or a DAO-designated slasher can confiscate part
 *           of a node's stake as a penalty; slashed ETH is forwarded to a
 *           treasury address.
 *         - A time-lock prevents instant withdrawal, giving the admin a window
 *           to slash before a bad actor can exit.
 *
 * @dev Deployed on Hoodi testnet (chain ID 560048).
 */
contract SlashingVault is Ownable, ReentrancyGuard {
    // ── Constants ─────────────────────────────────────────────────────────────

    /// @notice Minimum ETH that must be locked before requesting a withdrawal.
    uint256 public constant MIN_STAKE = 0.01 ether;

    /// @notice Delay (in seconds) between unlock request and actual withdrawal.
    uint256 public constant WITHDRAWAL_DELAY = 7 days;

    // ── State ─────────────────────────────────────────────────────────────────

    /// @notice Total ETH staked per address.
    mapping(address => uint256) public stakes;

    /// @notice Timestamp when the node requested to unstake (0 = not requested).
    mapping(address => uint256) public withdrawalRequestedAt;

    /// @notice Amount the node asked to withdraw (pending time-lock).
    mapping(address => uint256) public pendingWithdrawals;

    /// @notice Authorised slashers (admin + optionally a DAO contract).
    mapping(address => bool) public isSlasher;

    /// @notice Destination for slashed ETH.
    address public treasury;

    // ── Events ────────────────────────────────────────────────────────────────

    /// @notice Emitted when a node stakes ETH.
    event Staked(address indexed node, uint256 amount, uint256 newTotal);

    /// @notice Emitted when a node requests a withdrawal (starts time-lock).
    event WithdrawalRequested(
        address indexed node,
        uint256         amount,
        uint256         unlocksAt
    );

    /// @notice Emitted when a node completes a withdrawal after the delay.
    event Withdrawn(address indexed node, uint256 amount);

    /// @notice Emitted when a bad actor is slashed.
    event Slashed(
        address indexed badActor,
        uint256         penaltyAmount,
        address indexed treasury,
        address indexed slasher
    );

    /// @notice Emitted when a slasher role is granted or revoked.
    event SlasherUpdated(address indexed account, bool authorised);

    /// @notice Emitted when the treasury address is changed.
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    // ── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlySlasher() {
        require(isSlasher[msg.sender], "SlashingVault: not a slasher");
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    /**
     * @param initialOwner Owner / admin address.
     * @param _treasury    Address that receives slashed funds.
     */
    constructor(address initialOwner, address _treasury) Ownable(initialOwner) {
        require(_treasury != address(0), "SlashingVault: zero treasury");
        treasury = _treasury;
        // Owner is automatically a slasher
        isSlasher[initialOwner] = true;
        emit SlasherUpdated(initialOwner, true);
    }

    // ── Staking ───────────────────────────────────────────────────────────────

    /**
     * @notice Stake ETH into the vault.
     * @dev    Any address can call this.  Emits {Staked}.
     */
    function stake() external payable {
        require(msg.value >= MIN_STAKE, "SlashingVault: below minimum stake");
        // Cancel any pending withdrawal if more funds are added
        if (pendingWithdrawals[msg.sender] > 0) {
            pendingWithdrawals[msg.sender]     = 0;
            withdrawalRequestedAt[msg.sender]  = 0;
        }
        stakes[msg.sender] += msg.value;
        emit Staked(msg.sender, msg.value, stakes[msg.sender]);
    }

    // ── Withdrawal ────────────────────────────────────────────────────────────

    /**
     * @notice Initiate a withdrawal; begins the WITHDRAWAL_DELAY time-lock.
     * @param  amount ETH to withdraw (must be ≤ available stake).
     */
    function requestWithdrawal(uint256 amount) external {
        require(amount > 0,                          "SlashingVault: zero amount");
        require(stakes[msg.sender] >= amount,        "SlashingVault: insufficient stake");
        require(pendingWithdrawals[msg.sender] == 0, "SlashingVault: withdrawal pending");

        stakes[msg.sender]               -= amount;
        pendingWithdrawals[msg.sender]    = amount;
        withdrawalRequestedAt[msg.sender] = block.timestamp;

        emit WithdrawalRequested(
            msg.sender,
            amount,
            block.timestamp + WITHDRAWAL_DELAY
        );
    }

    /**
     * @notice Complete a withdrawal after the time-lock expires.
     * @dev    Emits {Withdrawn}.
     */
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "SlashingVault: no pending withdrawal");
        require(
            block.timestamp >= withdrawalRequestedAt[msg.sender] + WITHDRAWAL_DELAY,
            "SlashingVault: time-lock active"
        );

        pendingWithdrawals[msg.sender]    = 0;
        withdrawalRequestedAt[msg.sender] = 0;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "SlashingVault: transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    // ── Slashing ──────────────────────────────────────────────────────────────

    /**
     * @notice Slash a bad actor's staked ETH and forward it to the treasury.
     * @dev    Callable only by authorised slashers (admin / DAO).
     *         Also cancels any pending withdrawal for the bad actor.
     *         Emits {Slashed}.
     * @param  badActor      Address to slash.
     * @param  penaltyAmount ETH to confiscate (≤ total stake + pending).
     */
    function slash(address badActor, uint256 penaltyAmount)
        external
        onlySlasher
        nonReentrant
    {
        require(badActor   != address(0), "SlashingVault: zero address");
        require(penaltyAmount > 0,        "SlashingVault: zero penalty");

        uint256 available = stakes[badActor] + pendingWithdrawals[badActor];
        require(available >= penaltyAmount, "SlashingVault: penalty exceeds stake");

        // Drain pending withdrawal first, then active stake
        if (pendingWithdrawals[badActor] >= penaltyAmount) {
            pendingWithdrawals[badActor] -= penaltyAmount;
        } else {
            uint256 remainder = penaltyAmount - pendingWithdrawals[badActor];
            pendingWithdrawals[badActor] = 0;
            stakes[badActor]            -= remainder;
        }

        (bool ok, ) = payable(treasury).call{value: penaltyAmount}("");
        require(ok, "SlashingVault: treasury transfer failed");

        emit Slashed(badActor, penaltyAmount, treasury, msg.sender);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    /**
     * @notice Grant or revoke slasher authority.
     * @param  account    Address to update.
     * @param  authorised True to grant, false to revoke.
     */
    function setSlasher(address account, bool authorised) external onlyOwner {
        require(account != address(0), "SlashingVault: zero address");
        isSlasher[account] = authorised;
        emit SlasherUpdated(account, authorised);
    }

    /**
     * @notice Update the treasury that receives slashed funds.
     * @param  newTreasury New treasury address.
     */
    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "SlashingVault: zero treasury");
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    // ── View helpers ─────────────────────────────────────────────────────────

    /**
     * @notice Total ETH collateral held in this vault.
     */
    function totalVaultBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice How much is locked for a node (staked + pending withdrawal).
     */
    function totalExposure(address node) external view returns (uint256) {
        return stakes[node] + pendingWithdrawals[node];
    }

    /**
     * @notice Seconds remaining on a node's withdrawal time-lock (0 if expired/none).
     */
    function withdrawalCooldown(address node) external view returns (uint256) {
        uint256 req = withdrawalRequestedAt[node];
        if (req == 0) return 0;
        uint256 expiresAt = req + WITHDRAWAL_DELAY;
        if (block.timestamp >= expiresAt) return 0;
        return expiresAt - block.timestamp;
    }
}
