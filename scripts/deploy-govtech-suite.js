const hre = require("hardhat");

/**
 * Deployment script for GovTech Layer-2 Rollup Smart Contract Suite
 * 
 * Deploys 5 core contracts:
 * 1. MerkleRegistry - Transaction integrity with batch submission
 * 2. CommitmentRegistry - Anti-backdating with commit-reveal
 * 3. SlashingVault - Economic penalties with staking
 * 4. MultiSigReallocation - Multi-sig with EIP-712 signatures
 * 5. AuditVRF - Chainlink VRF for random audits
 */
async function main() {
  console.log("\n========================================");
  console.log("🚀 DEPLOYING GOVTECH ROLLUP CONTRACTS");
  console.log("========================================\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying from:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(balance), "ETH\n");

  // ==================== 1. MERKLE REGISTRY ====================
  
  console.log("📦 1/5 Deploying MerkleRegistry...");
  const MerkleRegistry = await hre.ethers.getContractFactory("MerkleRegistry");
  const merkleRegistry = await MerkleRegistry.deploy(deployer.address);
  await merkleRegistry.waitForDeployment();
  const merkleAddr = await merkleRegistry.getAddress();
  console.log("   ✅ MerkleRegistry deployed to:", merkleAddr);

  // ==================== 2. COMMITMENT REGISTRY ====================
  
  console.log("\n🔒 2/5 Deploying CommitmentRegistry...");
  const CommitmentRegistry = await hre.ethers.getContractFactory("CommitmentRegistry");
  const commitmentRegistry = await CommitmentRegistry.deploy(deployer.address);
  await commitmentRegistry.waitForDeployment();
  const commitmentAddr = await commitmentRegistry.getAddress();
  console.log("   ✅ CommitmentRegistry deployed to:", commitmentAddr);

  // ==================== 3. SLASHING VAULT ====================
  
  console.log("\n⚔️  3/5 Deploying SlashingVault...");
  const treasury = deployer.address; // Use deployer as treasury for now
  const SlashingVault = await hre.ethers.getContractFactory("SlashingVault");
  const slashingVault = await SlashingVault.deploy(deployer.address, treasury);
  await slashingVault.waitForDeployment();
  const slashingAddr = await slashingVault.getAddress();
  console.log("   ✅ SlashingVault deployed to:", slashingAddr);

  // ==================== 4. MULTISIG REALLOCATION ====================
  
  console.log("\n✍️  4/5 Deploying MultiSigReallocation...");
  
  // For demo: Use 5 different addresses as governors (you can replace with real addresses)
  const governor1 = deployer.address;
  const governor2 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Example address
  const governor3 = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  const governor4 = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
  const governor5 = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65";
  
  const initialGovernors = [governor1, governor2, governor3, governor4, governor5];
  const requiredSignatures = 3; // 3-of-5 multisig
  
  const MultiSigReallocation = await hre.ethers.getContractFactory("MultiSigReallocation");
  const multiSigReallocation = await MultiSigReallocation.deploy(
    deployer.address,
    initialGovernors,
    requiredSignatures
  );
  await multiSigReallocation.waitForDeployment();
  const multiSigAddr = await multiSigReallocation.getAddress();
  console.log("   ✅ MultiSigReallocation deployed to:", multiSigAddr);
  console.log("   📊 Governors:", initialGovernors.length);
  console.log("   ✅ Required Signatures:", requiredSignatures);

  // ==================== 5. AUDIT VRF ====================
  
  console.log("\n🎲 5/5 Deploying AuditVRF...");
  
  // Chainlink VRF V2 parameters (Hoodi Testnet - update with actual values)
  const vrfCoordinator = process.env.VRF_COORDINATOR || "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625"; // Example Sepolia
  const subscriptionId = process.env.VRF_SUBSCRIPTION_ID || 1;
  const keyHash = process.env.VRF_KEY_HASH || "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c"; // Example
  
  const AuditVRF = await hre.ethers.getContractFactory("AuditVRF");
  const auditVRF = await AuditVRF.deploy(
    deployer.address,
    vrfCoordinator,
    subscriptionId,
    keyHash
  );
  await auditVRF.waitForDeployment();
  const auditAddr = await auditVRF.getAddress();
  console.log("   ✅ AuditVRF deployed to:", auditAddr);
  console.log("   📡 VRF Coordinator:", vrfCoordinator);
  console.log("   🔑 Subscription ID:", subscriptionId);

  // ==================== DEPLOYMENT SUMMARY ====================
  
  console.log("\n========================================");
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log("========================================\n");
  
  console.log("📄 Contract Addresses:\n");
  console.log("1️⃣  MerkleRegistry:        ", merkleAddr);
  console.log("2️⃣  CommitmentRegistry:    ", commitmentAddr);
  console.log("3️⃣  SlashingVault:         ", slashingAddr);
  console.log("4️⃣  MultiSigReallocation:  ", multiSigAddr);
  console.log("5️⃣  AuditVRF:              ", auditAddr);
  
  console.log("\n========================================");
  console.log("📝 NEXT STEPS");
  console.log("========================================\n");
  
  console.log("1. Update .env with contract addresses:");
  console.log(`   MERKLE_REGISTRY_ADDRESS=${merkleAddr}`);
  console.log(`   COMMITMENT_REGISTRY_ADDRESS=${commitmentAddr}`);
  console.log(`   SLASHING_VAULT_ADDRESS=${slashingAddr}`);
  console.log(`   MULTISIG_REALLOCATION_ADDRESS=${multiSigAddr}`);
  console.log(`   AUDIT_VRF_ADDRESS=${auditAddr}`);
  
  console.log("\n2. Verify contracts on block explorer:");
  console.log(`   npx hardhat verify --network ${hre.network.name} ${merkleAddr} ${deployer.address}`);
  
  console.log("\n3. Set up Chainlink VRF subscription:");
  console.log("   - Add AuditVRF contract as consumer");
  console.log("   - Fund subscription with LINK");
  
  console.log("\n4. Configure cross-contract integrations:");
  console.log("   - Grant SLASHER_ROLE to MerkleRegistry in SlashingVault");
  console.log("   - Grant BATCH_SUBMITTER_ROLE to authorized operators");
  console.log("   - Register departments in CommitmentRegistry");
  console.log("   - Register departments in AuditVRF");
  
  console.log("\n========================================\n");

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      MerkleRegistry: merkleAddr,
      CommitmentRegistry: commitmentAddr,
      SlashingVault: slashingAddr,
      MultiSigReallocation: multiSigAddr,
      AuditVRF: auditAddr
    },
    config: {
      treasury,
      governors: initialGovernors,
      requiredSignatures,
      vrfCoordinator,
      subscriptionId: subscriptionId.toString()
    }
  };

  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, '../deployed-contracts');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const filename = `govtech-suite-${hre.network.name}-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(deploymentsDir, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("💾 Deployment info saved to:", filename);
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ DEPLOYMENT FAILED:\n");
    console.error(error);
    process.exit(1);
  });
