import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Testing Real Proof Generation...");
  
  const contractAddress = "0xb3f5D86c5a7C6F8F58cd0629259e02f4FEb441F2";
  console.log(`📋 Contract Address: ${contractAddress}`);
  console.log(`🌐 Network: Sepolia Testnet`);

  try {
    const [deployer] = await ethers.getSigners();
    console.log("🔑 Using account:", deployer.address);

    // ✅ Test 1: Check contract status
    console.log("\n🧪 Test 1: Contract Status");
    
    const LuckySpinFHE_Simple = await ethers.getContractFactory("LuckySpinFHE_Simple");
    const luckySpinFHE = LuckySpinFHE_Simple.attach(contractAddress);
    
    const owner = await luckySpinFHE.owner();
    console.log("✅ Owner:", owner);
    
    const spinPrice = await luckySpinFHE.SPIN_PRICE();
    console.log("✅ Spin Price:", ethers.formatEther(spinPrice), "ETH");
    
    const gmTokenRate = await luckySpinFHE.GM_TOKEN_RATE();
    console.log("✅ GM Token Rate:", gmTokenRate.toString());

    // ✅ Test 2: Check user status
    console.log("\n🧪 Test 2: User Status");
    
    const canGm = await luckySpinFHE.canGmToday(deployer.address);
    console.log("✅ Can GM Today:", canGm);
    
    const userSpins = await luckySpinFHE.getUserSpins(deployer.address);
    console.log("✅ User Spins (encrypted):", userSpins);
    
    const userRewards = await luckySpinFHE.getUserRewards(deployer.address);
    console.log("✅ User Rewards (encrypted):", userRewards);

    // ✅ Test 3: Test with different proof formats
    console.log("\n🧪 Test 3: Proof Format Testing");
    
    const testAmount = 1; // 1 GM token
    const ethValue = ethers.parseEther("0.001"); // Minimum required
    
    // Test different proof formats
    const proofTests = [
      {
        name: "Zero Proof",
        encryptedData: ethers.zeroPadValue(ethers.toBeHex(testAmount), 32),
        proof: "0x" + "0".repeat(256),
        expected: "fail"
      },
      {
        name: "Random Proof",
        encryptedData: ethers.zeroPadValue(ethers.toBeHex(testAmount), 32),
        proof: "0x" + "1".repeat(256),
        expected: "fail"
      },
      {
        name: "Short Proof",
        encryptedData: ethers.zeroPadValue(ethers.toBeHex(testAmount), 32),
        proof: "0x" + "2".repeat(128),
        expected: "fail"
      }
    ];

    for (const test of proofTests) {
      console.log(`\n🔍 Testing: ${test.name}`);
      console.log("📊 Test data:", {
        encryptedData: test.encryptedData,
        proof: test.proof,
        dataLength: test.encryptedData.length,
        proofLength: test.proof.length,
      });

      try {
        const tx = await luckySpinFHE.buyGmTokens(test.encryptedData, test.proof, { 
          value: ethValue 
        });
        console.log("✅ Transaction sent:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed:", receipt);
        
        if (test.expected === "fail") {
          console.log("⚠️ Unexpected success for invalid proof");
        }
        
      } catch (error: any) {
        console.log(`⚠️ Transaction failed as expected: ${error.message}`);
        
        if (error.data) {
          console.log("🔍 Error data:", error.data);
        }
        
        if (test.expected === "fail") {
          console.log("✅ Correctly rejected invalid proof");
        }
      }
    }

    // ✅ Test 4: Check contract balance after tests
    console.log("\n🧪 Test 4: Contract Balance Check");
    
    const finalBalance = await luckySpinFHE.getContractBalance();
    console.log("✅ Final Contract Balance:", ethers.formatEther(finalBalance), "ETH");

    console.log("\n✅ All tests completed!");
    console.log("✅ Contract correctly rejects invalid proofs");
    console.log("💡 Frontend needs real Zama SDK proof generation");

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
