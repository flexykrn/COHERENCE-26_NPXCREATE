const hre = require("hardhat");
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';

async function loadContractInfo() {
  const filepath = path.join(__dirname, '../deployed-contracts', `rollup-${hre.network.name}-latest.json`);
  
  if (!fs.existsSync(filepath)) {
    throw new Error(`Contract not deployed on ${hre.network.name}. Run 'npm run deploy' first.`);
  }
  
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

async function verifyTransactionOffChain(batchId, txId) {
  const response = await fetch(
    `${API_BASE_URL}/api/batches/${batchId}/verify?tx_id=${txId}`,
    { method: 'POST' }
  );
  return await response.json();
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let batchIndex = null;
  let txId = null;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--batch' && i + 1 < args.length) {
      batchIndex = parseInt(args[i + 1]);
    }
    if (args[i] === '--tx' && i + 1 < args.length) {
      txId = args[i + 1];
    }
  }
  
  if (batchIndex === null || txId === null) {
    console.log("Usage: npm run verify-tx -- --batch <batch_index> --tx <tx_id>");
    console.log("\nExample:");
    console.log("  npm run verify-tx -- --batch 0 --tx 12345");
    process.exit(1);
  }
  
  console.log("🔍 Verifying Transaction\n");
  console.log("   Batch Index:", batchIndex);
  console.log("   Transaction ID:", txId, "\n");
  
  // Load contract info
  const contractInfo = await loadContractInfo();
  console.log("📍 Contract address:", contractInfo.address);
  console.log("🌐 Network:", hre.network.name, "\n");
  
  // Connect to contract
  const TransactionRollup = await hre.ethers.getContractFactory("TransactionRollup");
  const rollup = await TransactionRollup.attach(contractInfo.address);
  
  // Get batch from contract
  console.log("📦 Fetching batch from contract...");
  const batch = await rollup.getBatch(batchIndex);
  console.log("✅ Batch found:");
  console.log("   Merkle Root:", batch.merkleRoot);
  console.log("   Transaction Count:", batch.transactionCount.toString());
  console.log("   Timestamp:", new Date(batch.timestamp.toNumber() * 1000).toISOString());
  console.log("   Finalized:", batch.isFinalized, "\n");
  
  // Find the batch_id from submission records
  const recordsDir = path.join(__dirname, '../batch-submissions');
  let batchId = null;
  
  if (fs.existsSync(recordsDir)) {
    const files = fs.readdirSync(recordsDir);
    for (const file of files) {
      const content = JSON.parse(fs.readFileSync(path.join(recordsDir, file), 'utf8'));
      if (content.batch_index === batchIndex) {
        batchId = content.batch_id;
        break;
      }
    }
  }
  
  if (!batchId) {
    console.error("❌ Could not find batch_id for index", batchIndex);
    console.log("\nThis might be because:");
    console.log("1. Batch was submitted from another machine");
    console.log("2. Submission records were deleted");
    console.log("\nPlease check batch-submissions/ directory or the backend API");
    process.exit(1);
  }
  
  console.log("🔗 Found batch_id:", batchId);
  
  // Get verification proof from backend
  console.log("\n🔐 Generating Merkle proof...");
  const verification = await verifyTransactionOffChain(batchId, txId);
  
  if (!verification.valid) {
    console.error("❌ Transaction not found in batch");
    process.exit(1);
  }
  
  console.log("✅ Proof generated:");
  console.log("   Leaf Hash:", verification.leaf);
  console.log("   Proof Length:", verification.proof.length);
  console.log("   Computed Root:", verification.computed_root, "\n");
  
  // Verify against off-chain root first
  console.log("🧪 Off-chain verification:");
  console.log("   Expected Root:", verification.root);
  console.log("   Computed Root:", verification.computed_root);
  console.log("   Match:", verification.root === verification.computed_root ? "✅ YES" : "❌ NO");
  
  // Verify against on-chain contract
  console.log("\n⛓️  On-chain verification...");
  const isValid = await rollup.verifyTransaction(
    verification.leaf,
    verification.proof,
    batchIndex
  );
  
  console.log("\n" + "=".repeat(60));
  console.log(isValid ? "✅ VERIFICATION SUCCESSFUL!" : "❌ VERIFICATION FAILED!");
  console.log("=".repeat(60));
  
  if (isValid) {
    console.log("\n✅ Transaction is valid and exists in the batch");
    console.log("   Transaction ID:", txId);
    console.log("   Batch Index:", batchIndex);
    console.log("   Merkle Root:", batch.merkleRoot);
    console.log("   Leaf Hash:", verification.leaf);
    console.log("\n📊 Proof Path:");
    verification.proof.forEach((hash, i) => {
      console.log(`   ${i + 1}. ${hash}`);
    });
  } else {
    console.log("\n❌ Transaction verification failed!");
    console.log("\nPossible reasons:");
    console.log("1. Transaction not in this batch");
    console.log("2. Merkle proof is invalid");
    console.log("3. Batch was modified after submission");
  }
  
  console.log("\n" + "=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Verification error:");
    console.error(error.message);
    process.exit(1);
  });
