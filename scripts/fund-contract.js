const { ethers } = require("hardhat");

async function main() {
  console.log("💰 Funding Contract...");

  // Contract address
  const CONTRACT_ADDRESS = "0x85c56f386DD4E56C96a9176f1A44D4294264E907";

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log(`📡 Funding from: ${signer.address}`);

  // Get contract
  const contract = await ethers.getContractAt("LuckySpinFHE_Strict", CONTRACT_ADDRESS);

  // Check current balance
  const balance = await ethers.provider.getBalance(CONTRACT_ADDRESS);
  console.log(`📊 Contract current balance: ${ethers.formatEther(balance)} ETH`);

  // Fund amount (0.1 ETH)
  const fundAmount = ethers.parseEther("0.1");

  // Send ETH to contract
  try {
    const tx = await signer.sendTransaction({
      to: CONTRACT_ADDRESS,
      value: fundAmount,
      gasLimit: 100_000,
    });
    console.log(`⏳ Funding contract... TX: ${tx.hash}`);
    await tx.wait();
    console.log("✅ Contract funded successfully!");

    // Check new balance
    const newBalance = await ethers.provider.getBalance(CONTRACT_ADDRESS);
    console.log(`📊 Contract new balance: ${ethers.formatEther(newBalance)} ETH`);
  } catch (error) {
    console.error("❌ Failed to fund contract:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
