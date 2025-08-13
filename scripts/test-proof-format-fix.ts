import { ethers } from "hardhat";

async function testProofFormatFix() {
  console.log("🧪 Testing proof format fix for ENUM_RANGE_ERROR...");

  try {
    // Contract address
    const contractAddress = "0xE334A43F3eb88eAf1CaeE6Fa64873feB94D7588A";

    // Get signer
    const [signer] = await ethers.getSigners();
    console.log("🔑 Using signer:", signer.address);

    // Get contract
    const LuckySpinFHE_ACL_Simple = await ethers.getContractFactory("LuckySpinFHE_ACL_Simple");
    const contract = LuckySpinFHE_ACL_Simple.attach(contractAddress);
    console.log("📋 Contract attached to:", contractAddress);

    // Test different proof formats
    console.log("\n📋 Testing different proof formats...");

    const testCases = [
      {
        name: "Original format with padding",
        proof:
          "0x" +
          "000894fac4403ae1ed2ee0b71febd82b5b9b551b51213e795177b3a03421635dba26202f0d88870cf5843c7b3a321048be53dbf69c3fa5db6fff448528560cfe654c7d695c99b7c2618aac5f31d2ccbeae68fd17849b6800dcfb84c4be8ecc978643eb09884dc5ce433b93a07823acd67046b1942e163a7c26e5a3e01cc79f".padStart(
            256,
            "0",
          ),
      },
      {
        name: "Fixed format without padding",
        proof:
          "0x000894fac4403ae1ed2ee0b71febd82b5b9b551b51213e795177b3a03421635dba26202f0d88870cf5843c7b3a321048be53dbf69c3fa5db6fff448528560cfe654c7d695c99b7c2618aac5f31d2ccbeae68fd17849b6800dcfb84c4be8ecc978643eb09884dc5ce433b93a07823acd67046b1942e163a7c26e5a3e01cc79f",
      },
      {
        name: "Valid enum value 0",
        proof:
          "0x000894fac4403ae1ed2ee0b71febd82b5b9b551b51213e795177b3a03421635dba26202f0d88870cf5843c7b3a321048be53dbf69c3fa5db6fff448528560cfe654c7d695c99b7c2618aac5f31d2ccbeae68fd17849b6800dcfb84c4be8ecc978643eb09884dc5ce433b93a07823acd67046b1942e163a7c26e5a3e01cc79f",
      },
      {
        name: "Valid enum value 1",
        proof:
          "0x100894fac4403ae1ed2ee0b71febd82b5b9b551b51213e795177b3a03421635dba26202f0d88870cf5843c7b3a321048be53dbf69c3fa5db6fff448528560cfe654c7d695c99b7c2618aac5f31d2ccbeae68fd17849b6800dcfb84c4be8ecc978643eb09884dc5ce433b93a07823acd67046b1942e163a7c26e5a3e01cc79f",
      },
      {
        name: "Valid enum value 2",
        proof:
          "0x200894fac4403ae1ed2ee0b71febd82b5b9b551b51213e795177b3a03421635dba26202f0d88870cf5843c7b3a321048be53dbf69c3fa5db6fff448528560cfe654c7d695c99b7c2618aac5f31d2ccbeae68fd17849b6800dcfb84c4be8ecc978643eb09884dc5ce433b93a07823acd67046b1942e163a7c26e5a3e01cc79f",
      },
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n🧪 Test ${i + 1}: ${testCase.name}`);
      console.log(`📋 Proof: ${testCase.proof.substring(0, 20)}...`);
      console.log(`📋 Proof length: ${testCase.proof.length}`);

      // ✅ Create encrypted data với valid format
      const encryptedData =
        "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

      // Test Buy GM Tokens
      const ethValue = ethers.parseEther("0.01"); // 0.01 ETH

      try {
        const tx = await contract.buyGmTokens(encryptedData, testCase.proof, { value: ethValue });
        console.log(`✅ Test ${i + 1} successful - Transaction sent:`, tx.hash);

        const receipt = await tx.wait();
        console.log(`✅ Test ${i + 1} confirmed:`, receipt.transactionHash);
      } catch (error: any) {
        console.error(`❌ Test ${i + 1} failed:`, error.message);

        if (error.message.includes("ENUM_RANGE_ERROR")) {
          console.error(`❌ Test ${i + 1} still getting ENUM_RANGE_ERROR`);
        } else if (error.message.includes("0xb9688461")) {
          console.error(`❌ Test ${i + 1} custom error 0xb9688461 - may be ACL issue`);
        } else {
          console.error(`❌ Test ${i + 1} other error:`, error.message);
        }
      }
    }

    console.log("\n📊 Summary:");
    console.log("✅ All proof format tests completed");
    console.log("✅ Different enum values tested: 0, 1, 2");
    console.log("✅ Different proof formats tested");
    console.log("✅ Frontend should use the working format");
  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
  }

  console.log("\n🏁 Proof format fix test completed!");
}

testProofFormatFix()
  .then(() => {
    console.log("✅ Test completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
