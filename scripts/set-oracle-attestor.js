const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Setting Oracle Attestor...");

  // Contract address
  const CONTRACT_ADDRESS = "0x85c56f386DD4E56C96a9176f1A44D4294264E907";

  // Oracle private key (phải match với server)
  const ORACLE_PRIVATE_KEY = "0x1234567890123456789012345678901234567890123456789012345678901234";
  const oracleWallet = new ethers.Wallet(ORACLE_PRIVATE_KEY);
  const oracleAddress = oracleWallet.address;

  console.log(`📡 Oracle Address: ${oracleAddress}`);

  // Get contract
  const contract = await ethers.getContractAt("LuckySpinFHE_Strict", CONTRACT_ADDRESS);

  // Get current attestor
  const currentAttestor = await contract.attestor();
  console.log(`📋 Current Attestor: ${currentAttestor}`);

  if (currentAttestor.toLowerCase() === oracleAddress.toLowerCase()) {
    console.log("✅ Oracle attestor already set correctly");
    return;
  }

  // Set new attestor (chỉ owner mới có thể)
  try {
    const tx = await contract.setAttestor(oracleAddress);
    console.log(`⏳ Setting attestor... TX: ${tx.hash}`);
    await tx.wait();
    console.log("✅ Oracle attestor set successfully!");
  } catch (error) {
    console.error("❌ Failed to set attestor:", error.message);
    console.log("💡 Make sure you're the contract owner");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
