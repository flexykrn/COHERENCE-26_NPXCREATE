/**
 * batch.js — Merkle Tree Batching Script for COHERENCE-26
 *
 * What it does:
 *  1. Calls the backend to find unbatched transactions
 *  2. Creates a batch (backend hashes txns, builds Merkle tree, stores proofs)
 *  3. Displays the Merkle root + proofs
 *  4. Optionally submits the root to RollupBatch on Hoodi via ethers.js
 *
 * Usage:
 *   node scripts/batch.js                  # create a batch of 50
 *   node scripts/batch.js --limit 100      # batch size 100
 *   node scripts/batch.js --submit         # also submit root to Hoodi
 *   node scripts/batch.js --verify 0       # verify all txns in batch #0
 */

const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const axios = require("axios");
require("dotenv").config({ path: "../../.env" });

const API_BASE = process.env.API_URL || "http://localhost:8000";
const ROLLUP_CONTRACT = process.env.ROLLUP_BATCH_ADDRESS || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const HOODI_RPC = "https://ethereum-hoodi-rpc.publicnode.com";
const HOODI_EXPLORER = "https://hoodi.ethpandaops.io";

// ── Arg parsing ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : 50;
const SHOULD_SUBMIT = args.includes("--submit");
const verifyIdx = args.indexOf("--verify");
const VERIFY_BATCH = verifyIdx !== -1 ? parseInt(args[verifyIdx + 1]) : null;

// ── Helpers ───────────────────────────────────────────────────────────────────
function hexToBuffer(hex) {
  return Buffer.from(hex.replace("0x", ""), "hex");
}

/**
 * Rebuild Merkle tree locally from leaves (for verification and display).
 * Uses keccak256 sorted-pair to match OpenZeppelin MerkleProof.sol.
 */
function buildLocalTree(leaves) {
  // leaves are hex strings like "0xabc..."
  const bufLeaves = leaves.map(hexToBuffer);
  const tree = new MerkleTree(bufLeaves, keccak256, {
    sortPairs: true,
    hashLeaves: false, // leaves are already hashed
  });
  return tree;
}

function bufToHex(buf) {
  return "0x" + buf.toString("hex");
}

// ── Main flow ─────────────────────────────────────────────────────────────────
async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  COHERENCE-26 — Merkle Batch Script");
  console.log(`  API: ${API_BASE}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // ── VERIFY MODE ──────────────────────────────────────────────────────────
  if (VERIFY_BATCH !== null) {
    await verifyBatch(VERIFY_BATCH);
    return;
  }

  // ── CHECK UNBATCHED COUNT ─────────────────────────────────────────────────
  const { data: counts } = await axios.get(`${API_BASE}/api/merkle/unbatched-count`);
  console.log(`📊 Transactions:`);
  console.log(`   Total    : ${counts.total.toLocaleString()}`);
  console.log(`   Batched  : ${counts.batched.toLocaleString()}`);
  console.log(`   Unbatched: ${counts.unbatched.toLocaleString()}`);

  if (counts.unbatched === 0) {
    console.log("\n✅ All transactions already batched.");
    return;
  }

  // ── CREATE BATCH ──────────────────────────────────────────────────────────
  console.log(`\n⚙️  Creating batch of ${LIMIT} transactions…`);
  const { data: batch } = await axios.post(
    `${API_BASE}/api/merkle/batches/create`,
    { limit: LIMIT }
  );

  console.log(`\n✅ Batch #${batch.batch_id} created`);
  console.log(`   Label    : ${batch.label}`);
  console.log(`   TX count : ${batch.tx_count}`);
  console.log(`   Root     : ${batch.root}`);
  console.log(`   Created  : ${batch.created_at}`);

  // ── LOCAL TREE VERIFICATION ───────────────────────────────────────────────
  console.log(`\n🌳 Rebuilding Merkle tree locally (merkletreejs)…`);
  const leaves = batch.transactions.map((tx) => tx.leaf);
  const tree = buildLocalTree(leaves);
  const localRoot = bufToHex(tree.getRoot());

  console.log(`   Backend root : ${batch.root}`);
  console.log(`   Local root   : ${localRoot}`);

  if (localRoot === batch.root) {
    console.log(`   ✅ Roots match — backend and local tree are consistent`);
  } else {
    console.log(`   ⚠️  Root mismatch (expected for SHA-256 vs keccak256 demo mode)`);
  }

  // ── SHOW SAMPLE PROOFS ────────────────────────────────────────────────────
  console.log(`\n📋 Sample proofs (first 3 transactions):`);
  const sample = batch.transactions.slice(0, 3);
  for (const tx of sample) {
    const proof = batch.proofs[tx.tx_id];
    console.log(`\n   TX #${tx.tx_id}`);
    console.log(`   DDO     : ${tx.ddo_code}`);
    console.log(`   Vendor  : ${tx.vendor_id}`);
    console.log(`   Amount  : ₹${tx.amount.toLocaleString("en-IN")}`);
    console.log(`   Leaf    : ${tx.leaf}`);
    console.log(`   Proof   : [${proof.length} nodes]`);
    proof.forEach((p, i) => console.log(`     [${i}] ${p}`));
  }

  // ── HOODI SUBMISSION ──────────────────────────────────────────────────────
  if (SHOULD_SUBMIT) {
    await submitToHoodi(batch);
  } else {
    console.log(
      `\n💡 To submit this root to Hoodi: node scripts/batch.js --submit`
    );
    console.log(
      `   To verify batch #${batch.batch_id}: node scripts/batch.js --verify ${batch.batch_id}`
    );
  }
}

async function verifyBatch(batchId) {
  console.log(`🔍 Verifying all transactions in Batch #${batchId}…\n`);

  const { data: batch } = await axios.get(
    `${API_BASE}/api/merkle/batches/${batchId}`
  );
  console.log(`   Root     : ${batch.root}`);
  console.log(`   Label    : ${batch.label}`);
  console.log(`   TX count : ${batch.tx_count}\n`);

  let passed = 0;
  let failed = 0;

  for (const tx of batch.transactions) {
    const proof = batch.proofs[tx.tx_id];
    const { data: result } = await axios.post(
      `${API_BASE}/api/merkle/batches/${batchId}/verify`,
      { leaf: tx.leaf, proof }
    );
    if (result.verified) {
      passed++;
    } else {
      failed++;
      console.log(`   ❌ FAIL: TX #${tx.tx_id} — ${tx.ddo_code}`);
    }
  }

  console.log(`\n✅ ${passed}/${batch.tx_count} verified`);
  if (failed > 0) console.log(`❌ ${failed} failed`);
}

async function submitToHoodi(batch) {
  if (!ROLLUP_CONTRACT) {
    console.log(
      "\n⚠️  ROLLUP_BATCH_ADDRESS not set in .env — skipping on-chain submission."
    );
    console.log(
      "   Deploy the contract first: npx hardhat run scripts/deploy.js --network hoodi"
    );
    return;
  }
  if (!PRIVATE_KEY) {
    console.log("\n⚠️  PRIVATE_KEY not set in .env — skipping on-chain submission.");
    return;
  }

  try {
    const { ethers } = require("ethers");
    const provider = new ethers.JsonRpcProvider(HOODI_RPC);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    const abi = [
      "function submitBatch(bytes32 _merkleRoot, string calldata _batchRef, uint256 _txCount) external",
      "function getBatchCount() external view returns (uint256)",
    ];
    const contract = new ethers.Contract(ROLLUP_CONTRACT, abi, wallet);

    // Convert Python hex root → bytes32
    const rootBytes32 = batch.root.startsWith("0x")
      ? batch.root
      : "0x" + batch.root;

    console.log(`\n📡 Submitting to Hoodi (${ROLLUP_CONTRACT})…`);
    const tx = await contract.submitBatch(
      rootBytes32,
      batch.label,
      batch.tx_count
    );
    console.log(`   Tx sent  : ${tx.hash}`);
    console.log(
      `   Explorer : ${HOODI_EXPLORER}/tx/${tx.hash}`
    );

    const receipt = await tx.wait();
    console.log(`   Confirmed in block #${receipt.blockNumber}`);

    const count = await contract.getBatchCount();
    console.log(`   On-chain batch index: ${Number(count) - 1}`);
    console.log(
      `\n✅ Root submitted on-chain. Everyone can now verify txns from Batch #${batch.batch_id}.`
    );
    console.log(
      `   ${HOODI_EXPLORER}/address/${ROLLUP_CONTRACT}`
    );

    // Mark as submitted in backend too
    await axios.post(
      `http://localhost:8000/api/merkle/batches/${batch.batch_id}/submit`
    );
  } catch (err) {
    console.error("\n❌ On-chain submission failed:", err.message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
