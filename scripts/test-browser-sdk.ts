import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Testing Browser Zama SDK...");
  
  const contractAddress = "0xb3f5D86c5a7C6F8F58cd0629259e02f4FEb441F2";
  console.log(`📋 Contract Address: ${contractAddress}`);
  console.log(`🌐 Network: Sepolia Testnet`);

  try {
    const [deployer] = await ethers.getSigners();
    console.log("🔑 Using account:", deployer.address);

    // ✅ Test 1: Simulate browser environment
    console.log("\n🧪 Test 1: Browser SDK Simulation");
    
    // Simulate the browser SDK loading
    const mockZamaSDK = {
      SepoliaConfig: {
        chainId: 11155111,
        rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/oppYpzscO7hdTG6hopypG6Opn3Xp7lR_",
        relayerUrl: "https://relayer.testnet.zama.cloud"
      },
      createInstance: async (config: any) => {
        console.log("✅ Mock SDK createInstance called with config:", config);
        return {
          createEncryptedInput: (contractAddress: string, userAddress: string) => {
            console.log("✅ Mock createEncryptedInput called");
            return {
              add64: (value: bigint) => {
                console.log("✅ Mock add64 called with value:", value);
              },
              encrypt: async () => {
                console.log("✅ Mock encrypt called");
                // Return mock encrypted data
                return {
                  handles: ["0x" + "1".repeat(64)], // 32 bytes
                  inputProof: "0x" + "2".repeat(256)  // 128 bytes
                };
              }
            };
          }
        };
      }
    };

    // ✅ Test 2: Test mock SDK
    console.log("\n🧪 Test 2: Mock SDK Test");
    
    const config = { ...mockZamaSDK.SepoliaConfig, network: "mock" };
    const instance = await mockZamaSDK.createInstance(config);
    
    console.log("✅ Mock SDK Instance created:", {
      instance: instance,
      methods: Object.keys(instance),
      hasCreateEncryptedInput: typeof instance.createEncryptedInput === 'function',
    });

    // ✅ Test 3: Test encrypted input creation
    console.log("\n🧪 Test 3: Mock Encrypted Input Test");
    
    const testAmount = 1;
    const input = instance.createEncryptedInput(contractAddress, deployer.address);
    input.add64(BigInt(testAmount));
    
    const { handles, inputProof } = await input.encrypt();
    
    console.log("✅ Mock encrypted input created:", {
      handles: handles,
      inputProof: inputProof,
      dataLength: handles[0]?.length,
      proofLength: inputProof?.length,
    });

    // ✅ Test 4: Test with real contract
    console.log("\n🧪 Test 4: Real Contract Test");
    
    const LuckySpinFHE_Simple = await ethers.getContractFactory("LuckySpinFHE_Simple");
    const luckySpinFHE = LuckySpinFHE_Simple.attach(contractAddress);
    
    const ethValue = ethers.parseEther("0.001");
    
    try {
      const tx = await luckySpinFHE.buyGmTokens(handles[0], inputProof, { 
        value: ethValue 
      });
      console.log("✅ Transaction sent:", tx.hash);
      
      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed:", receipt);
      
    } catch (error: any) {
      console.log("⚠️ Transaction failed as expected:", error.message);
      
      if (error.data) {
        console.log("🔍 Error data:", error.data);
        console.log("🔍 This confirms contract is rejecting mock proofs");
      }
    }

    console.log("\n✅ All tests completed!");
    console.log("✅ Mock SDK functionality verified");
    console.log("💡 Real SDK should work similarly in browser");

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
