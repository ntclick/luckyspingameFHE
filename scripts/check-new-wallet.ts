import { ethers } from "hardhat";

async function main() {
  console.log("💰 Checking new wallet balance on Sepolia...");

  // Create wallet with the new private key
  const privateKey = "859b25f164df967d1b6b04b81693a9f53785a6f2b03bf3c6b20796f60ca8d814";
  const wallet = new ethers.Wallet(privateKey);
  
  console.log(`👤 New Wallet Address: ${wallet.address}`);
  
  // Connect to provider
  const provider = ethers.provider;
  const connectedWallet = wallet.connect(provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  
  // Check if balance is sufficient for deployment
  const minBalance = ethers.parseEther("0.01"); // Minimum 0.01 ETH for deployment
  if (balance >= minBalance) {
    console.log("✅ Sufficient balance for deployment");
  } else {
    console.log("❌ Insufficient balance for deployment");
    console.log("💡 You need at least 0.01 ETH for deployment");
  }
  
  return { address: wallet.address, balance: ethers.formatEther(balance) };
}

main()
  .then((result) => {
    console.log("\n✅ New wallet balance check completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error checking new wallet balance:", error);
    process.exit(1);
  }); 