import { ethers } from "ethers";

async function fixAclAccess() {
  console.log("🔧 Fixing ACL Access Issues...");
  console.log("─".repeat(50));

  // Configuration (hardcoded to avoid config issues)
  const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/oppYpzscO7hdTG6hopypG6Opn3Xp7lR_";
  const PRIVATE_KEY = "859b25f164df967d1b6b04b81693a9f53785a6f2b03bf3c6b20796f60ca8d814";
  const ACL_CONTRACT_ADDRESS = "0x687820221192C5B662b25367F70076A37bc79b6c";
  const DECRYPTION_ADDRESS = "0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1";

  // Connect to provider
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  // Get signer from private key
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log(`🔑 Using signer: ${signer.address}`);
  console.log(`🔗 Connected to: ${RPC_URL}`);

  // ACL Contract ABI
  const aclAbi = [
    "function authorizeUser(address user) external",
    "function authorizeRelayer(address relayer) external", 
    "function isUserAuthorized(address user) external view returns (bool)",
    "function isRelayerAuthorized(address relayer) external view returns (bool)",
    "function hasDecryptionKey(address user) external view returns (bool)"
  ];

  // Create ACL contract instance
  const aclContract = new ethers.Contract(
    ACL_CONTRACT_ADDRESS,
    aclAbi,
    signer
  );

  console.log(`📋 ACL Contract: ${ACL_CONTRACT_ADDRESS}`);

  // Test addresses
  const testUser = signer.address;
  const relayerAddress = DECRYPTION_ADDRESS;

  console.log(`👤 Test User: ${testUser}`);
  console.log(`🔗 Relayer Address: ${relayerAddress}`);

  try {
    // Check current authorization status
    console.log("\n🔍 Checking current authorization status...");
    
    const userAuthorized = await aclContract.isUserAuthorized(testUser);
    const relayerAuthorized = await aclContract.isRelayerAuthorized(relayerAddress);
    const userHasDecryptKey = await aclContract.hasDecryptionKey(testUser);
    const relayerHasDecryptKey = await aclContract.hasDecryptionKey(relayerAddress);

    console.log(`✅ User Authorized: ${userAuthorized}`);
    console.log(`✅ Relayer Authorized: ${relayerAuthorized}`);
    console.log(`🔑 User Has Decrypt Key: ${userHasDecryptKey}`);
    console.log(`🔑 Relayer Has Decrypt Key: ${relayerHasDecryptKey}`);

    // Grant authorization if needed
    console.log("\n🔧 Granting authorizations...");

    if (!userAuthorized) {
      console.log("🔐 Authorizing user...");
      const tx = await aclContract.authorizeUser(testUser);
      await tx.wait();
      console.log("✅ User authorized successfully");
    } else {
      console.log("✅ User already authorized");
    }

    if (!relayerAuthorized) {
      console.log("🔐 Authorizing relayer...");
      const tx = await aclContract.authorizeRelayer(relayerAddress);
      await tx.wait();
      console.log("✅ Relayer authorized successfully");
    } else {
      console.log("✅ Relayer already authorized");
    }

    // Verify final status
    console.log("\n🔍 Verifying final authorization status...");
    
    const finalUserAuthorized = await aclContract.isUserAuthorized(testUser);
    const finalRelayerAuthorized = await aclContract.isRelayerAuthorized(relayerAddress);
    const finalUserHasDecryptKey = await aclContract.hasDecryptionKey(testUser);
    const finalRelayerHasDecryptKey = await aclContract.hasDecryptionKey(relayerAddress);

    console.log(`✅ Final User Authorized: ${finalUserAuthorized}`);
    console.log(`✅ Final Relayer Authorized: ${finalRelayerAuthorized}`);
    console.log(`🔑 Final User Has Decrypt Key: ${finalUserHasDecryptKey}`);
    console.log(`🔑 Final Relayer Has Decrypt Key: ${finalRelayerHasDecryptKey}`);

    if (finalUserAuthorized && finalRelayerAuthorized) {
      console.log("\n🎉 ACL Access Fixed Successfully!");
      console.log("Frontend should now be able to decrypt data.");
    } else {
      console.log("\n⚠️ Some ACL issues remain. Check contract permissions.");
    }

  } catch (error: any) {
    console.error("❌ Error fixing ACL access:", error);
    
    if (error.message?.includes("Only owner")) {
      console.log("💡 Solution: Use the contract owner's private key");
      console.log("   Update REACT_APP_PRIVATE_KEY in .env file");
    }
    
    if (error.message?.includes("execution reverted")) {
      console.log("💡 Solution: Check if ACL contract is deployed correctly");
      console.log("   Verify ACL contract address and deployment");
    }
  }
}

// Run the fix
fixAclAccess().catch(console.error);
