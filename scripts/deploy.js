const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Deploying TransactionRollup contract to Hoodi Network...\n");
  
  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying from account:", deployer.address);
  
  // Check balance
  const balance = await deployer.getBalance();
  console.log("💰 Account balance:", hre.ethers.utils.formatEther(balance), "ETH\n");
  
  if (balance.eq(0)) {
    console.error("❌ ERROR: Account has no balance! Please fund the account first.");
    process.exit(1);
  }
  
  // Deploy contract
  console.log("⏳ Deploying TransactionRollup...");
  const TransactionRollup = await hre.ethers.getContractFactory("TransactionRollup");
  const rollup = await TransactionRollup.deploy();
  
  await rollup.deployed();
  
  console.log("\n✅ TransactionRollup deployed successfully!");
  console.log("📍 Contract address:", rollup.address);
  console.log("👤 Admin address:", await rollup.admin());
  console.log("🔢 Version:", await rollup.version());
  console.log("🌐 Network:", hre.network.name);
  
  // Save contract information
  const contractInfo = {
    address: rollup.address,
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    version: await rollup.version(),
    blockNumber: await hre.ethers.provider.getBlockNumber()
  };
  
  // Create contracts directory if it doesn't exist
  const contractsDir = path.join(__dirname, '../deployed-contracts');
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }
  
  // Save to JSON file
  const filename = `rollup-${hre.network.name}-${Date.now()}.json`;
  const filepath = path.join(contractsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(contractInfo, null, 2));
  
  // Also save as latest
  const latestPath = path.join(contractsDir, `rollup-${hre.network.name}-latest.json`);
  fs.writeFileSync(latestPath, JSON.stringify(contractInfo, null, 2));
  
  console.log("\n📄 Contract info saved to:");
  console.log("  -", filepath);
  console.log("  -", latestPath);
  
  // If on testnet/mainnet, provide explorer link
  if (hre.network.name !== 'hardhat' && hre.network.name !== 'localhost') {
    const explorerUrl = process.env.HOODI_EXPLORER_URL || 'https://explorer.hoodi.network';
    console.log(`\n🔍 View on Explorer: ${explorerUrl}/address/${rollup.address}`);
    
    console.log("\n⏳ Waiting for 5 confirmations before verification...");
    await rollup.deployTransaction.wait(5);
    console.log("✅ 5 confirmations received");
    
    // Verify contract
    console.log("\n🔍 Verifying contract on explorer...");
    try {
      await hre.run("verify:verify", {
        address: rollup.address,
        constructorArguments: [],
      });
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      console.log("⚠️  Verification failed (this is normal if contract is already verified)");
      console.log("   Error:", error.message);
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("🎉 Deployment complete!");
  console.log("=".repeat(60));
  console.log("\nNext steps:");
  console.log("1. Update .env file with contract address:");
  console.log(`   NEXT_PUBLIC_CONTRACT_ADDRESS=${rollup.address}`);
  console.log("\n2. Create a batch:");
  console.log("   npm run create-batch");
  console.log("\n3. Submit batch to contract:");
  console.log("   npm run submit-batch");
  console.log("\n4. Verify transactions via frontend:");
  console.log("   http://localhost:3000/batches");
  console.log("=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
