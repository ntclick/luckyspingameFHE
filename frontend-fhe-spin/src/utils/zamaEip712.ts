import { ethers } from "ethers";

// ✅ EIP-712 Domain cho Zama FHEVM Relayer
const EIP712_DOMAIN = {
  name: "ZamaFHEVMRelayer",
  version: "1.0.0",
  chainId: 11155111, // Sepolia testnet
};

// ✅ EIP-712 Types cho encrypted input
const EIP712_TYPES = {
  EncryptedInput: [
    { name: "userAddress", type: "address" },
    { name: "contractAddress", type: "address" },
    { name: "functionName", type: "string" },
    { name: "inputValues", type: "uint256[]" },
    { name: "nonce", type: "uint256" },
  ],
};

export interface ZamaEIP712Signature {
  signature: string;
  message: any;
  userAddress: string;
}

export class ZamaEIP712Signer {
  private provider: ethers.BrowserProvider;
  private signer: ethers.Signer;

  constructor(provider: ethers.BrowserProvider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  /**
   * Tạo EIP-712 signature cho Zama encrypted input
   */
  async signEncryptedInput(
    userAddress: string,
    contractAddress: string,
    functionName: string,
    inputValues: number[]
  ): Promise<ZamaEIP712Signature> {
    try {
      const nonce = Math.floor(Date.now() / 1000);
      
      const message = {
        userAddress,
        contractAddress,
        functionName,
        inputValues,
        nonce,
      };

      console.log("🔐 Creating EIP-712 signature for Zama:", {
        userAddress,
        contractAddress,
        functionName,
        inputValues,
        nonce,
      });

      // Create EIP-712 signature
      const signature = await this.signer.signTypedData(
        EIP712_DOMAIN,
        EIP712_TYPES,
        message
      );

      console.log("✅ EIP-712 signature created:", signature);

      return {
        signature,
        message,
        userAddress,
      };
    } catch (error) {
      console.error("❌ EIP-712 signature failed:", error);
      throw new Error(`Failed to create EIP-712 signature: ${error}`);
    }
  }

  /**
   * Verify EIP-712 signature
   */
  async verifySignature(
    signature: string,
    message: any,
    expectedAddress: string
  ): Promise<boolean> {
    try {
      const recoveredAddress = ethers.verifyTypedData(
        EIP712_DOMAIN,
        EIP712_TYPES,
        message,
        signature
      );

      const isValid = recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
      console.log("🔍 Signature verification:", { isValid, recoveredAddress, expectedAddress });

      return isValid;
    } catch (error) {
      console.error("❌ Signature verification failed:", error);
      return false;
    }
  }

  /**
   * Tạo encrypted input với EIP-712 signature cho Zama SDK
   */
  async createSignedEncryptedInput(
    contractAddress: string,
    functionName: string,
    values: number[],
    userAddress: string
  ) {
    try {
      // Tạo EIP-712 signature
      const signature = await this.signEncryptedInput(
        userAddress,
        contractAddress,
        functionName,
        values
      );

      // Return signature data để sử dụng với Zama SDK
      return {
        signature: signature.signature,
        userAddress,
        contractAddress,
        functionName,
        values,
        message: signature.message,
      };
    } catch (error) {
      console.warn("⚠️ Failed to create signed encrypted input:", error);
      return null;
    }
  }
}

// ✅ Export singleton instance
let zamaEIP712Signer: ZamaEIP712Signer | null = null;

export const initializeZamaEIP712 = (
  provider: ethers.BrowserProvider,
  signer: ethers.Signer
) => {
  zamaEIP712Signer = new ZamaEIP712Signer(provider, signer);
  return zamaEIP712Signer;
};

export const getZamaEIP712Signer = () => {
  if (!zamaEIP712Signer) {
    throw new Error("ZamaEIP712Signer not initialized. Call initializeZamaEIP712 first.");
  }
  return zamaEIP712Signer;
};
