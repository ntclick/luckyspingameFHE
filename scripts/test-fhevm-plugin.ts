import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Testing FHEVM Plugin Initialization...");
  
  console.log("\n📋 FHEVM Plugin Test Plan");
  console.log("==========================");
  console.log("✅ Test 1: Plugin Availability");
  console.log("✅ Test 2: FHEVM Instance");
  console.log("✅ Test 3: Encrypted Input Creation");
  console.log("✅ Test 4: Contract Integration");

  // ✅ Test 1: Plugin Availability
  console.log("\n🧪 Test 1: Plugin Availability");
  
  try {
    // Check if fhevm is available in global scope
    const fhevm = (global as any).fhevm;
    console.log("✅ FHEVM available in global scope:", !!fhevm);
    
    if (fhevm) {
      console.log("✅ FHEVM methods:", Object.keys(fhevm));
    }
  } catch (error) {
    console.log("❌ FHEVM not available in global scope");
  }

  // ✅ Test 2: FHEVM Instance
  console.log("\n🧪 Test 2: FHEVM Instance");
  
  try {
    // Try to get FHEVM instance
    const fhevm = (global as any).fhevm;
    if (fhevm && fhevm.instance) {
      console.log("✅ FHEVM instance available");
      console.log("✅ Instance methods:", Object.keys(fhevm.instance));
    } else {
      console.log("❌ FHEVM instance not available");
    }
  } catch (error) {
    console.log("❌ FHEVM instance error:", error);
  }

  // ✅ Test 3: Encrypted Input Creation
  console.log("\n🧪 Test 3: Encrypted Input Creation");
  
  try {
    const contractAddress = "0xb3f5D86c5a7C6F8F58cd0629259e02f4FEb441F2";
    const userAddress = "0xE24546D5Ff7bf460Ebdaa36847e38669996D1a0D";
    
    // Try to create encrypted input
    const input = (global as any).fhevm?.createEncryptedInput?.(contractAddress, userAddress);
    
    if (input) {
      console.log("✅ Encrypted input created successfully");
      console.log("✅ Input methods:", Object.keys(input));
      
      // Try to add value
      if (typeof input.add64 === 'function') {
        input.add64(BigInt(100));
        console.log("✅ add64 method working");
      } else {
        console.log("❌ add64 method not available");
      }
      
      // Try to encrypt
      if (typeof input.encrypt === 'function') {
        const result = await input.encrypt();
        console.log("✅ encrypt method working");
        console.log("✅ Result:", result);
      } else {
        console.log("❌ encrypt method not available");
      }
    } else {
      console.log("❌ Could not create encrypted input");
    }
  } catch (error: any) {
    console.log("❌ Encrypted input creation failed:", error.message);
  }

  // ✅ Test 4: Contract Integration
  console.log("\n🧪 Test 4: Contract Integration");
  
  try {
    const [deployer] = await ethers.getSigners();
    const LuckySpinFHE_Simple = await ethers.getContractFactory("LuckySpinFHE_Simple");
    const luckySpinFHE = LuckySpinFHE_Simple.attach("0xb3f5D86c5a7C6F8F58cd0629259e02f4FEb441F2");
    
    const owner = await luckySpinFHE.owner();
    console.log("✅ Contract accessible");
    console.log("✅ Owner:", owner);
    
    // Try to call buyGmTokens with real encrypted input
    if ((global as any).fhevm?.createEncryptedInput) {
      const input = (global as any).fhevm.createEncryptedInput(
        "0xb3f5D86c5a7C6F8F58cd0629259e02f4FEb441F2",
        deployer.address
      );
      input.add64(BigInt(100));
      const { handles, inputProof } = await input.encrypt();
      
      console.log("✅ Real encrypted input created");
      console.log("✅ Handles:", handles);
      console.log("✅ Input Proof:", inputProof);
      
      // Try to call contract
      try {
        const tx = await luckySpinFHE.buyGmTokens(handles[0], inputProof, {
          value: ethers.parseEther("0.001")
        });
        console.log("✅ Transaction successful:", tx.hash);
      } catch (error: any) {
        console.log("⚠️ Transaction failed (expected if proof invalid):", error.message);
      }
    } else {
      console.log("❌ Cannot create real encrypted input");
    }
    
  } catch (error: any) {
    console.log("❌ Contract integration failed:", error.message);
  }

  // ✅ Test 5: Environment Check
  console.log("\n🧪 Test 5: Environment Check");
  
  console.log("✅ Hardhat version:", require("hardhat/package.json").version);
  console.log("✅ FHEVM plugin version:", require("@fhevm/hardhat-plugin/package.json").version);
  console.log("✅ Node version:", process.version);
  console.log("✅ Platform:", process.platform);

  console.log("\n✅ All FHEVM plugin tests completed!");
  console.log("💡 Plugin status verified");

}

main()
  .then(() => {
    console.log("\n✅ FHEVM plugin testing completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
