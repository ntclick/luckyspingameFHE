import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying LuckySpinFHE_ACL contract (Simple)...");

  // Get the contract factory
  const LuckySpinFHE_ACL = await ethers.getContractFactory("LuckySpinFHE_ACL_Simple");

  // For ACL, we need a host contract address
  // For now, we'll use a zero address as placeholder
  // In production, you would deploy a proper ACL host contract
  const aclHostAddress = ethers.ZeroAddress;

  console.log("📋 Contract parameters:");
  console.log(`   ACL Host Address: ${aclHostAddress}`);

  // Deploy the contract
  const luckySpinACL = await LuckySpinFHE_ACL.deploy(aclHostAddress);

  // Wait for deployment
  await luckySpinACL.waitForDeployment();

  const contractAddress = await luckySpinACL.getAddress();
  console.log("✅ Contract deployed successfully!");
  console.log(`   Contract Address: ${contractAddress}`);
  console.log(`   Owner: ${await luckySpinACL.owner()}`);
  console.log(`   ACL Host: ${await luckySpinACL.aclHost()}`);

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  
  try {
    // Check if owner is authorized
    const owner = await luckySpinACL.owner();
    const isOwnerAuthorized = await luckySpinACL.isUserAuthorized(owner);
    const isOwnerRelayer = await luckySpinACL.isRelayerAuthorized(owner);
    
    console.log(`   Owner authorized: ${isOwnerAuthorized}`);
    console.log(`   Owner relayer: ${isOwnerRelayer}`);
    
    if (isOwnerAuthorized && isOwnerRelayer) {
      console.log("✅ ACL setup verified successfully!");
    } else {
      console.log("❌ ACL setup verification failed!");
    }
  } catch (error) {
    console.log("❌ Verification failed:", error);
  }

  console.log("\n📝 Next steps:");
  console.log("1. Update frontend config with new contract address");
  console.log("2. Deploy proper ACL host contract if needed");
  console.log("3. Authorize users and relayers as needed");
  console.log("4. Test ACL functionality");

  return {
    contractAddress,
    owner: await luckySpinACL.owner(),
    aclHost: await luckySpinACL.aclHost()
  };
}

main()
  .then((result) => {
    console.log("\n🎉 Deployment completed!");
    console.log("Contract details:", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
