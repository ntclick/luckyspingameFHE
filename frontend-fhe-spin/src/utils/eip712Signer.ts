import { ethers } from "ethers";

// ✅ EIP-712 Domain for Zama FHEVM
const EIP712_DOMAIN = {
  name: "ZamaFHEVM",
  version: "1.0.0",
  chainId: 11155111, // Sepolia
  verifyingContract:
    (process.env.REACT_APP_FHEVM_CONTRACT_ADDRESS as string) || "0x0000000000000000000000000000000000000000",
};

// ✅ EIP-712 Types for encrypted input creation
const EIP712_TYPES = {
  EncryptedInput: [
    { name: "userAddress", type: "address" },
    { name: "contractAddress", type: "address" },
    { name: "functionName", type: "string" },
    { name: "inputValues", type: "uint256[]" },
    { name: "nonce", type: "uint256" },
    { name: "timestamp", type: "uint256" },
  ],
};

export interface EIP712SignatureData {
  signature: string;
  message: any;
}

export class EIP712Signer {
  private provider: ethers.BrowserProvider;
  private signer: ethers.Signer;

  constructor(provider: ethers.BrowserProvider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  /**
   * Create EIP-712 signature for encrypted input
   */
  async signEncryptedInput(
    userAddress: string,
    contractAddress: string,
    functionName: string,
    inputValues: number[],
    nonce?: number,
  ): Promise<EIP712SignatureData> {
    try {
      const currentNonce = nonce || Math.floor(Date.now() / 1000);
      const timestamp = Math.floor(Date.now() / 1000);

      const message = {
        userAddress,
        contractAddress,
        functionName,
        inputValues,
        nonce: currentNonce,
        timestamp,
      };

      console.log("🔐 Creating EIP-712 signature for:", message);

      // Request signature from user's wallet
      const signature = await this.signer.signTypedData(EIP712_DOMAIN, EIP712_TYPES, message);

      console.log("✅ EIP-712 signature created:", signature);

      return {
        signature,
        message,
      };
    } catch (error) {
      console.error("❌ EIP-712 signature failed:", error);
      throw new Error(`Failed to create EIP-712 signature: ${error}`);
    }
  }

  /**
   * Verify EIP-712 signature
   */
  async verifySignature(signature: string, message: any, expectedAddress: string): Promise<boolean> {
    try {
      const recoveredAddress = ethers.verifyTypedData(EIP712_DOMAIN, EIP712_TYPES, message, signature);

      const isValid = recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
      console.log("🔍 Signature verification:", { isValid, recoveredAddress, expectedAddress });

      return isValid;
    } catch (error) {
      console.error("❌ Signature verification failed:", error);
      return false;
    }
  }

  /**
   * Get current nonce for user (can be implemented to use contract nonce)
   */
  async getNonce(userAddress: string): Promise<number> {
    // For now, use timestamp as nonce
    // In production, this should query the contract for user nonce
    return Math.floor(Date.now() / 1000);
  }
}

// ✅ Export singleton instance
let eip712Signer: EIP712Signer | null = null;

export const initializeEIP712Signer = (provider: ethers.BrowserProvider, signer: ethers.Signer) => {
  eip712Signer = new EIP712Signer(provider, signer);
  return eip712Signer;
};

export const getEIP712Signer = () => {
  if (!eip712Signer) {
    throw new Error("EIP712Signer not initialized. Call initializeEIP712Signer first.");
  }
  return eip712Signer;
};

// Simple EIP-191 attestation for claimETH
export async function signClaimAttestation(
  signer: ethers.Signer,
  contractAddress: string,
  user: string,
  amountWei: bigint,
  nonce: bigint,
) {
  const digest = ethers.solidityPackedKeccak256(
    ["address", "address", "uint256", "uint256"],
    [contractAddress, user, amountWei, nonce],
  );
  const signature = await signer.signMessage(ethers.toBeArray(digest));
  return signature;
}
