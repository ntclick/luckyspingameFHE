import { ethers } from "hardhat";

async function main() {
  console.log("💰 Checking wallet balance on Sepolia...");

  const [signer] = await ethers.getSigners();
  const address = signer.address;
  
  console.log(`👤 Wallet Address: ${address}`);
  
  const balance = await ethers.provider.getBalance(address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  
  // Check if balance is sufficient for deployment
  const minBalance = ethers.parseEther("0.01"); // Minimum 0.01 ETH for deployment
  if (balance >= minBalance) {
    console.log("✅ Sufficient balance for deployment");
  } else {
    console.log("❌ Insufficient balance for deployment");
    console.log("💡 You need at least 0.01 ETH for deployment");
  }
  
  return { address, balance: ethers.formatEther(balance) };
}

main()
  .then((result) => {
    console.log("\n✅ Balance check completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error checking balance:", error);
    process.exit(1);
  }); 