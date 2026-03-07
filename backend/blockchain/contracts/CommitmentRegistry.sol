// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CommitmentRegistry
 * @notice Implements a commit-reveal scheme that prevents backdating or
 *         retroactive alteration of government budget figures.
 *
 *         Workflow
 *         --------
 *         1. A department officer hashes their budget offline:
 *            hash = keccak256(abi.encodePacked(msg.sender, amount, details, nonce))
 *         2. Officer calls commitBudget(hash) — the hash is stored immutably
 *            on-chain.  The actual numbers remain private at this point.
 *         3. When the budget is to be published, the officer calls
 *            revealBudget(amount, details, nonce).  The contract re-derives the
 *            hash and reverts if it doesn't match — proving the figures were
 *            fixed at commit-time and never altered.
 *
 * @dev Deployed on Hoodi testnet (chain ID 560048).
 */
contract CommitmentRegistry is Ownable, ReentrancyGuard {
    // ── Data types ────────────────────────────────────────────────────────────

    struct Commitment {
        bytes32   hash;         // keccak256 of (committer, amount, details, nonce)
        uint256   committedAt;  // block.timestamp of commit
        bool      revealed;     // true after a successful reveal
        uint256   amount;       // populated on reveal
        string    details;      // populated on reveal
        uint256   nonce;        // populated on reveal (for public auditability)
    }

    // ── State ─────────────────────────────────────────────────────────────────

    /// @notice address → their single active commitment
    mapping(address => Commitment) public commitments;

    // ── Events ────────────────────────────────────────────────────────────────

    /**
     * @notice Emitted when a budget hash is committed.
     * @param committer   The officer's address.
     * @param hash        The opaque commitment hash.
     * @param timestamp   Block time of the commitment.
     */
    event BudgetCommitted(
        address indexed committer,
        bytes32 indexed hash,
        uint256         timestamp
    );

    /**
     * @notice Emitted when a commitment is successfully revealed.
     * @param committer  The officer's address.
     * @param amount     Budget amount in wei / smallest currency unit.
     * @param details    Human-readable budget description.
     * @param nonce      The nonce used at commit-time.
     * @param timestamp  Block time of the reveal.
     */
    event BudgetRevealed(
        address indexed committer,
        uint256         amount,
        string          details,
        uint256         nonce,
        uint256         timestamp
    );

    // ── Constructor ───────────────────────────────────────────────────────────

    /**
     * @param initialOwner Admin address (owner role).
     */
    constructor(address initialOwner) Ownable(initialOwner) {}

    // ── Write functions ───────────────────────────────────────────────────────

    /**
     * @notice Lock in a budget commitment hash on-chain.
     * @dev    Caller must not already have an unrevealed commitment.
     *         Compute the hash off-chain:
     *           hash = keccak256(abi.encodePacked(address, amount, details, nonce))
     *         Emits {BudgetCommitted}.
     * @param  budgetHash The commitment hash to store.
     */
    function commitBudget(bytes32 budgetHash) external {
        require(budgetHash != bytes32(0), "CommitmentRegistry: zero hash");
        Commitment storage c = commitments[msg.sender];
        require(
            c.hash == bytes32(0) || c.revealed,
            "CommitmentRegistry: unrevealed commitment exists"
        );

        commitments[msg.sender] = Commitment({
            hash:        budgetHash,
            committedAt: block.timestamp,
            revealed:    false,
            amount:      0,
            details:     "",
            nonce:       0
        });

        emit BudgetCommitted(msg.sender, budgetHash, block.timestamp);
    }

    /**
     * @notice Reveal a previously committed budget.
     * @dev    Re-derives keccak256(abi.encodePacked(msg.sender, amount, details, nonce))
     *         and compares it to the stored hash.  Reverts on mismatch — this is
     *         the core anti-backdating guarantee.
     *         Emits {BudgetRevealed}.
     * @param  amount   The budget figure committed earlier.
     * @param  details  The budget description committed earlier.
     * @param  nonce    The unique nonce used when computing the hash.
     */
    function revealBudget(
        uint256        amount,
        string calldata details,
        uint256        nonce
    ) external nonReentrant {
        Commitment storage c = commitments[msg.sender];
        require(c.hash != bytes32(0),  "CommitmentRegistry: no commitment found");
        require(!c.revealed,           "CommitmentRegistry: already revealed");

        bytes32 expected = keccak256(
            abi.encodePacked(msg.sender, amount, details, nonce)
        );
        require(
            expected == c.hash,
            "CommitmentRegistry: hash mismatch - data was altered"
        );

        c.revealed = true;
        c.amount   = amount;
        c.details  = details;
        c.nonce    = nonce;

        emit BudgetRevealed(msg.sender, amount, details, nonce, block.timestamp);
    }

    // ── Read functions ────────────────────────────────────────────────────────

    /**
     * @notice Derive the expected commitment hash for given inputs.
     *         A convenience helper — use this off-chain before calling commitBudget.
     * @param  committer Address that will call commitBudget.
     * @param  amount    Budget amount.
     * @param  details   Budget description.
     * @param  nonce     Unique nonce (e.g. block.timestamp or random uint256).
     * @return           The keccak256 commitment hash.
     */
    function deriveHash(
        address        committer,
        uint256        amount,
        string calldata details,
        uint256        nonce
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(committer, amount, details, nonce));
    }

    /**
     * @notice Check whether address has revealed their current commitment.
     * @param  who Address to query.
     */
    function isRevealed(address who) external view returns (bool) {
        return commitments[who].revealed;
    }

    /**
     * @notice Return full commitment record for an address.
     * @param  who Address to query.
     */
    function getCommitment(address who)
        external
        view
        returns (
            bytes32 hash,
            uint256 committedAt,
            bool    revealed,
            uint256 amount,
            string  memory details,
            uint256 nonce
        )
    {
        Commitment memory c = commitments[who];
        return (c.hash, c.committedAt, c.revealed, c.amount, c.details, c.nonce);
    }
}
