/**
 * deploy.js — Deploy the full COHERENCE-26 smart-contract suite to Hoodi testnet.
 *
 * Contracts deployed (in order):
 *   1. RollupBatch          — existing batch submission + Merkle proof
 *   2. MerkleRegistry       — on-chain Merkle root registry (Ownable)
 *   3. CommitmentRegistry   — commit-reveal budget anti-backdating
 *   4. SlashingVault        — stake / time-locked-withdraw / slash
 *   5. MultiSigReallocation — EIP-712 3-of-5 governance multi-sig
 *   6. AuditVRF             — Chainlink VRF v2.5 random audit selector
 *
 * Run:
 *   npx hardhat run scripts/deploy.js --network hoodi
 *
 * Environment variables (in ../../.env):
 *   PRIVATE_KEY           — deployer private key
 *   TREASURY_ADDRESS      — destination for slashed ETH (defaults to deployer)
 *   MULTISIG_SIGNERS      — comma-separated list of 5 governance signer addresses
 *   VRF_SUBSCRIPTION_ID   — Chainlink VRF subscription ID (uint256)
 *   VRF_KEY_HASH          — Chainlink key hash (bytes32, defaults to Hoodi 500 gwei lane)
 */

require("dotenv").config({ path: "../../.env" });
const hre = require("hardhat");

// Hoodi Chainlink VRF v2.5 defaults
const VRF_COORDINATOR_HOODI = "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B";
const VRF_KEYHASH_HOODI     = "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae";

function sep(title) {
  console.log("\n" + "-".repeat(60));
  if (title) console.log("  " + title);
  console.log("-".repeat(60));
}

async function deployContract(factory, args, label) {
  process.stdout.write(`  Deploying ${label}... `);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const addr    = await contract.getAddress();
  const receipt = await contract.deploymentTransaction().wait();
  console.log(`OK  ${addr}`);
  console.log(`     tx: https://hoodi.etherscan.io/tx/${receipt.hash}`);
  return { contract, address: addr, receipt };
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  sep("COHERENCE-26 -- Full Contract Suite --> Hoodi Testnet");
  console.log("  Deployer :", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("  Balance  :", hre.ethers.formatEther(balance), "ETH\n");

  if (balance === 0n) {
    console.error("ERROR: Deployer has no ETH. Fund it on Hoodi first.");
    process.exit(1);
  }

  // Resolve config from env
  const treasury = process.env.TREASURY_ADDRESS || deployer.address;
  console.log("  Treasury :", treasury);

  // 5 governance signers for MultiSig -- default to deployer x5 for testing
  const rawSigners = process.env.MULTISIG_SIGNERS;
  let signers;
  if (rawSigners) {
    signers = rawSigners.split(",").map(s => s.trim());
    if (signers.length !== 5) {
      console.error("ERROR: MULTISIG_SIGNERS must be exactly 5 comma-separated addresses.");
      process.exit(1);
    }
  } else {
    console.warn("  WARNING: MULTISIG_SIGNERS not set -- using deployer address x5 (testing only)");
    signers = Array(5).fill(deployer.address);
  }

  const vrfSubId   = BigInt(process.env.VRF_SUBSCRIPTION_ID || "1");
  const vrfKeyHash = process.env.VRF_KEY_HASH || VRF_KEYHASH_HOODI;
  console.log("  VRF Sub  :", vrfSubId.toString());

  sep("Deploying Contracts");

  // 1. RollupBatch
  const RollupBatch = await hre.ethers.getContractFactory("RollupBatch");
  const rb = await deployContract(RollupBatch, [], "RollupBatch");

  // 2. MerkleRegistry
  const MerkleRegistry = await hre.ethers.getContractFactory("MerkleRegistry");
  const mr = await deployContract(MerkleRegistry, [deployer.address], "MerkleRegistry");

  // 3. CommitmentRegistry
  const CommitmentRegistry = await hre.ethers.getContractFactory("CommitmentRegistry");
  const cr = await deployContract(CommitmentRegistry, [deployer.address], "CommitmentRegistry");

  // 4. SlashingVault
  const SlashingVault = await hre.ethers.getContractFactory("SlashingVault");
  const sv = await deployContract(SlashingVault, [deployer.address, treasury], "SlashingVault");

  // 5. MultiSigReallocation
  const MultiSigReallocation = await hre.ethers.getContractFactory("MultiSigReallocation");
  const ms = await deployContract(
    MultiSigReallocation,
    [deployer.address, signers],
    "MultiSigReallocation"
  );

  // 6. AuditVRF (Chainlink VRF v2.5)
  const AuditVRF = await hre.ethers.getContractFactory("AuditVRF");
  const av = await deployContract(
    AuditVRF,
    [VRF_COORDINATOR_HOODI, vrfKeyHash, vrfSubId, 1],
    "AuditVRF"
  );

  // Summary
  sep("Deployment Summary -- add to .env");
  console.log(`ROLLUP_BATCH_ADDRESS=${rb.address}`);
  console.log(`MERKLE_REGISTRY_ADDRESS=${mr.address}`);
  console.log(`COMMITMENT_REGISTRY_ADDRESS=${cr.address}`);
  console.log(`SLASHING_VAULT_ADDRESS=${sv.address}`);
  console.log(`MULTISIG_REALLOCATION_ADDRESS=${ms.address}`);
  console.log(`AUDIT_VRF_ADDRESS=${av.address}`);

  sep("Explorer Links");
  const pairs = [
    ["RollupBatch",          rb.address],
    ["MerkleRegistry",       mr.address],
    ["CommitmentRegistry",   cr.address],
    ["SlashingVault",        sv.address],
    ["MultiSigReallocation", ms.address],
    ["AuditVRF",             av.address],
  ];
  for (const [name, addr] of pairs) {
    console.log(`  ${name.padEnd(22)}: https://hoodi.etherscan.io/address/${addr}`);
  }

  sep("Done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
