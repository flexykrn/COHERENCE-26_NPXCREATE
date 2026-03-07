/**
 * deploy.js — Deploy RollupBatch to Hoodi testnet
 * Run: npx hardhat run scripts/deploy.js --network hoodi
 */

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  RollupBatch — Deployment to Hoodi Testnet");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Deployer :", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("  Balance  :", hre.ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    console.error("❌ Deployer has no ETH. Fund it on Hoodi first.");
    process.exit(1);
  }

  console.log("\nDeploying RollupBatch…");
  const RollupBatch = await hre.ethers.getContractFactory("RollupBatch");
  const contract = await RollupBatch.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const receipt = await contract.deploymentTransaction().wait();

  console.log("\n✅ Deployed:");
  console.log("  Contract :", address);
  console.log("  Tx hash  :", receipt.hash);
  console.log("  Block    :", receipt.blockNumber);
  console.log(
    "  Explorer :", `https://hoodi.ethpandaops.io/address/${address}`
  );
  console.log(
    "  Tx       :", `https://hoodi.ethpandaops.io/tx/${receipt.hash}`
  );

  console.log("\n✏️  Add this to your .env:");
  console.log(`  ROLLUP_BATCH_ADDRESS=${address}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
