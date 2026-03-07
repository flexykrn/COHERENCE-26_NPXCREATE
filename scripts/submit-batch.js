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

async function getLatestBatch() {
  const response = await fetch(`${API_BASE_URL}/api/batches/list?status=pending`);
  const data = await response.json();
  
  if (!data.batches || data.batches.length === 0) {
    throw new Error('No pending batches found. Create a batch first using the API.');
  }
  
  return data.batches[data.batches.length - 1]; // Get the latest pending batch
}

async function getBatchDetail(batchId) {
  const response = await fetch(`${API_BASE_URL}/api/batches/${batchId}`);
  return await response.json();
}

async function markBatchSubmitted(batchId, txHash, batchIndex) {
  await fetch(`${API_BASE_URL}/api/batches/${batchId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tx_hash: txHash,
      contract_batch_index: batchIndex
    })
  });
}

async function main() {
  console.log("📦 Submitting Batch to Smart Contract\n");
  
  // Load contract info
  const contractInfo = await loadContractInfo();
  console.log("📍 Contract address:", contractInfo.address);
  console.log("🌐 Network:", hre.network.name, "\n");
  
  // Get latest pending batch
  console.log("🔍 Finding latest pending batch...");
  const latestBatch = await getLatestBatch();
  console.log("✅ Found batch:", latestBatch.batch_id);
  console.log("   Transactions:", latestBatch.transaction_count);
  console.log("   Merkle Root:", latestBatch.merkle_root, "\n");
  
  // Get full batch details
  const batch = await getBatchDetail(latestBatch.batch_id);
  
  // Connect to contract
  const [signer] = await hre.ethers.getSigners();
  console.log("👤 Submitting from:", signer.address);
  
  const balance = await signer.getBalance();
  console.log("💰 Balance:", hre.ethers.utils.formatEther(balance), "ETH\n");
  
  const TransactionRollup = await hre.ethers.getContractFactory("TransactionRollup");
  const rollup = await TransactionRollup.attach(contractInfo.address);
  
  // Verify signer is admin
  const admin = await rollup.admin();
  if (admin.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Only admin can submit batches. Admin: ${admin}, You: ${signer.address}`);
  }
  
  // Prepare metadata URI
  const metadataURI = `${API_BASE_URL}/api/batches/${batch.batch_id}`;
  
  console.log("📤 Submitting batch to blockchain...");
  console.log("   Merkle Root:", batch.merkle_root);
  console.log("   Transaction Count:", batch.transaction_count);
  console.log("   Metadata URI:", metadataURI, "\n");
  
  // Submit batch
  const tx = await rollup.submitBatch(
    batch.merkle_root,
    batch.transaction_count,
    metadataURI
  );
  
  console.log("⏳ Transaction sent:", tx.hash);
  console.log("   Waiting for confirmation...\n");
  
  const receipt = await tx.wait();
  
  console.log("✅ Transaction confirmed!");
  console.log("   Block number:", receipt.blockNumber);
  console.log("   Gas used:", receipt.gasUsed.toString());
  
  // Parse event to get batch index
  const event = receipt.events.find(e => e.event === 'BatchSubmitted');
  const batchIndex = event.args.batchIndex.toNumber();
  const rootFromEvent = event.args.merkleRoot;
  
  console.log("\n📊 Batch Details:");
  console.log("   On-chain Batch Index:", batchIndex);
  console.log("   Merkle Root:", rootFromEvent);
  console.log("   Timestamp:", new Date(event.args.timestamp.toNumber() * 1000).toISOString());
  
  // Verify the submission
  const onChainBatch = await rollup.getBatch(batchIndex);
  console.log("\n🔍 Verification:");
  console.log("   Stored Root:", onChainBatch.merkleRoot);
  console.log("   Transaction Count:", onChainBatch.transactionCount.toString());
  console.log("   Is Finalized:", onChainBatch.isFinalized);
  console.log("   Match:", onChainBatch.merkleRoot === batch.merkle_root ? "✅ YES" : "❌ NO");
  
  // Update backend
  console.log("\n💾 Updating backend...");
  await markBatchSubmitted(batch.batch_id, tx.hash, batchIndex);
  console.log("✅ Backend updated");
  
  // Save submission record
  const submissionRecord = {
    batch_id: batch.batch_id,
    contract_address: contractInfo.address,
    network: hre.network.name,
    tx_hash: tx.hash,
    block_number: receipt.blockNumber,
    batch_index: batchIndex,
    merkle_root: batch.merkle_root,
    transaction_count: batch.transaction_count,
    gas_used: receipt.gasUsed.toString(),
    submitted_at: new Date().toISOString()
  };
  
  const recordsDir = path.join(__dirname, '../batch-submissions');
  if (!fs.existsSync(recordsDir)) {
    fs.mkdirSync(recordsDir, { recursive: true });
  }
  
  const filename = `submission-${batch.batch_id}.json`;
  fs.writeFileSync(
    path.join(recordsDir, filename),
    JSON.stringify(submissionRecord, null, 2)
  );
  
  console.log("\n📄 Submission record saved to:");
  console.log("  ", path.join(recordsDir, filename));
  
  // Provide explorer link
  if (hre.network.name !== 'hardhat' && hre.network.name !== 'localhost') {
    const explorerUrl = process.env.HOODI_EXPLORER_URL || 'https://explorer.hoodi.network';
    console.log(`\n🔍 View on Explorer: ${explorerUrl}/tx/${tx.hash}`);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("🎉 Batch submission complete!");
  console.log("=".repeat(60));
  console.log("\nNext steps:");
  console.log("1. Verify transactions via frontend:");
  console.log("   http://localhost:3000/batches");
  console.log("\n2. Or use the verify script:");
  console.log(`   npm run verify-tx -- --batch ${batchIndex} --tx 1`);
  console.log("=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Submission failed:");
    console.error(error.message);
    process.exit(1);
  });
