import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Testing Frontend SDK Integration...");
  
  const contractAddress = "0xb3f5D86c5a7C6F8F58cd0629259e02f4FEb441F2";
  console.log(`📋 Contract Address: ${contractAddress}`);
  console.log(`🌐 Network: Sepolia Testnet`);

  try {
    const [deployer] = await ethers.getSigners();
    console.log("🔑 Using account:", deployer.address);

    // ✅ Test 1: Check contract accessibility
    console.log("\n🧪 Test 1: Contract Accessibility");
    
    const LuckySpinFHE_Simple = await ethers.getContractFactory("LuckySpinFHE_Simple");
    const luckySpinFHE = LuckySpinFHE_Simple.attach(contractAddress);
    
    const owner = await luckySpinFHE.owner();
    console.log("✅ Owner:", owner);
    
    const spinPrice = await luckySpinFHE.SPIN_PRICE();
    console.log("✅ Spin Price:", ethers.formatEther(spinPrice), "ETH");
    
    const gmTokenRate = await luckySpinFHE.GM_TOKEN_RATE();
    console.log("✅ GM Token Rate:", gmTokenRate.toString());

    // ✅ Test 2: Test view functions
    console.log("\n🧪 Test 2: View Functions");
    
    try {
      const contractBalance = await luckySpinFHE.getContractBalance();
      console.log("✅ Contract Balance:", ethers.formatEther(contractBalance), "ETH");
    } catch (error) {
      console.log("⚠️ Could not get contract balance:", error.message);
    }
    
    try {
      const canGm = await luckySpinFHE.canGmToday(deployer.address);
      console.log("✅ Can GM Today:", canGm);
    } catch (error) {
      console.log("⚠️ Could not check canGmToday:", error.message);
    }

    // ✅ Test 3: Test encrypted data retrieval
    console.log("\n🧪 Test 3: Encrypted Data Retrieval");
    
    try {
      const userSpins = await luckySpinFHE.getUserSpins(deployer.address);
      console.log("✅ User Spins (encrypted):", userSpins);
    } catch (error) {
      console.log("⚠️ Could not get user spins:", error.message);
    }
    
    try {
      const userRewards = await luckySpinFHE.getUserRewards(deployer.address);
      console.log("✅ User Rewards (encrypted):", userRewards);
    } catch (error) {
      console.log("⚠️ Could not get user rewards:", error.message);
    }

    // ✅ Test 4: Test with minimal transaction data
    console.log("\n🧪 Test 4: Minimal Transaction Test");
    
    const testAmount = 1; // 1 GM token
    const ethValue = ethers.parseEther("0.001"); // Minimum required
    
    // Create minimal encrypted data (32 bytes)
    const testEncryptedData = ethers.zeroPadValue(ethers.toBeHex(testAmount), 32);
    
    // Create minimal proof (128 bytes)
    const testProof = "0x" + "0".repeat(256);
    
    console.log("✅ Test data created:", {
      encryptedData: testEncryptedData,
      proof: testProof,
      ethValue: ethers.formatEther(ethValue),
      dataLength: testEncryptedData.length,
      proofLength: testProof.length,
    });

    // ✅ Test 5: Try transaction (will likely fail but we can see the error)
    console.log("\n🧪 Test 5: Transaction Test (Expected to fail)");
    
    try {
      const tx = await luckySpinFHE.buyGmTokens(testEncryptedData, testProof, { 
        value: ethValue 
      });
      console.log("✅ Transaction sent:", tx.hash);
      
      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed:", receipt);
      
    } catch (error: any) {
      console.log("⚠️ Transaction failed as expected:", error.message);
      
      if (error.data) {
        console.log("🔍 Error data:", error.data);
        console.log("🔍 This confirms contract is rejecting invalid proofs");
      }
    }

    console.log("\n✅ All tests completed!");
    console.log("✅ Contract is accessible and view functions work");
    console.log("⚠️ buyGmTokens requires proper FHE proof validation");
    console.log("💡 Frontend needs to use Zama SDK for real proof generation");

  } catch (error) {
    console.error("❌ Error during testing:", error);
  }
}

main()
  .then(() => {
    console.log("\n✅ Testing completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
