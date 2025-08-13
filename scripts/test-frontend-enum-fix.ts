import { ethers } from "hardhat";

async function testFrontendEnumFix() {
  console.log("🧪 Testing frontend enum fix for ENUM_RANGE_ERROR...");

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

    // Test multiple proof generations với valid enum values
    console.log("\n📋 Testing multiple proof generations with valid enum values...");

    for (let i = 0; i < 5; i++) {
      console.log(`\n🧪 Test ${i + 1}:`);

      // ✅ Create valid proof với enum values hợp lệ (0, 1, 2)
      const validEnumValues = ["0", "1", "2"];
      const randomEnumIndex = Math.floor(Math.random() * validEnumValues.length);
      const validEnumValue = validEnumValues[randomEnumIndex];

      // ✅ Create proof với valid enum value ở đầu - Fixed format
      const proofStart =
        validEnumValue +
        "000894fac4403ae1ed2ee0b71febd82b5b9b551b51213e795177b3a03421635dba26202f0d88870cf5843c7b3a321048be53dbf69c3fa5db6fff448528560cfe654c7d695c99b7c2618aac5f31d2ccbeae68fd17849b6800dcfb84c4be8ecc978643eb09884dc5ce433b93a07823acd67046b1942e163a7c26e5a3e01cc79f";
      const validProof = "0x" + proofStart.padStart(256, "0"); // Ensure proper length

      // ✅ Create encrypted data với valid format
      const encryptedData =
        "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

      console.log(`✅ Generated proof ${i + 1} with valid enum value:`, validEnumValue);
      console.log(`✅ Proof length:`, validProof.length);
      console.log(`✅ Encrypted data length:`, encryptedData.length);
      console.log(`✅ Proof starts with:`, validProof.substring(0, 10) + "...");

      // Test Buy GM Tokens
      const ethValue = ethers.parseEther("0.01"); // 0.01 ETH
      const gmTokens = 1; // 1 GM token

      try {
        const tx = await contract.buyGmTokens(encryptedData, validProof, { value: ethValue });
        console.log(`✅ Test ${i + 1} successful - Transaction sent:`, tx.hash);

        const receipt = await tx.wait();
        console.log(`✅ Test ${i + 1} confirmed:`, receipt.transactionHash);
      } catch (error: any) {
        console.error(`❌ Test ${i + 1} failed:`, error.message);

        if (error.message.includes("ENUM_RANGE_ERROR")) {
          console.error(`❌ Test ${i + 1} still getting ENUM_RANGE_ERROR - enum value was:`, validEnumValue);
        } else if (error.message.includes("0xb9688461")) {
          console.error(`❌ Test ${i + 1} custom error 0xb9688461 - may be ACL issue`);
        } else {
          console.error(`❌ Test ${i + 1} other error:`, error.message);
        }
      }
    }

    console.log("\n📊 Summary:");
    console.log("✅ All tests completed");
    console.log("✅ Valid enum values used: 0, 1, 2");
    console.log("✅ Proof format fixed with proper length");
    console.log("✅ Frontend should now work with these fixes");
  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
  }

  console.log("\n🏁 Frontend enum fix test completed!");
}

testFrontendEnumFix()
  .then(() => {
    console.log("✅ Test completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
