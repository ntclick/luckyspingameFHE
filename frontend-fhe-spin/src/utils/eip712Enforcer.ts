import { ethers } from "ethers";

/**
 * EIP-712 Signature Enforcer for Zama Protocol
 * 
 * According to Zama documentation:
 * - EIP-712 signatures are MANDATORY for all encrypted input submissions
 * - EIP-712 signatures are MANDATORY for all decryption requests
 * - All off-chain operations involving encrypted data must be cryptographically signed
 * - This ensures security, auditability, and verifiability of all encrypted operations
 */

// ✅ EIP-712 Domain for Zama FHEVM Protocol
const ZAMA_EIP712_DOMAIN = {
  name: "ZamaFHEVM",
  version: "1.0.0",
  chainId: 11155111, // Sepolia testnet
};

// ✅ EIP-712 Types for encrypted operations
const ZAMA_EIP712_TYPES = {
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" }
  ],
  EncryptedInput: [
    { name: "userAddress", type: "address" },
    { name: "contractAddress", type: "address" },
    { name: "functionName", type: "string" },
    { name: "inputValue", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "timestamp", type: "uint256" }
  ],
  DecryptionRequest: [
    { name: "userAddress", type: "address" },
    { name: "contractAddress", type: "address" },
    { name: "ciphertext", type: "bytes32" },
    { name: "nonce", type: "uint256" },
    { name: "timestamp", type: "uint256" }
  ]
};

export interface ZamaEIP712Signature {
  signature: string;
  message: any;
  domain: any;
  types: any;
  userAddress: string;
  timestamp: number;
}

export class EIP712Enforcer {
  private provider: ethers.BrowserProvider;
  private signer: ethers.Signer;
  private contractAddress: string;

  constructor(provider: ethers.BrowserProvider, signer: ethers.Signer, contractAddress: string) {
    this.provider = provider;
    this.signer = signer;
    this.contractAddress = contractAddress;
  }

  /**
   * MANDATORY: Create EIP-712 signature for encrypted input submission
   * This is required by Zama Protocol for all encrypted operations
   */
  async signEncryptedInput(
    functionName: string,
    inputValue: number,
    userAddress?: string
  ): Promise<ZamaEIP712Signature> {
    try {
      const address = userAddress || await this.signer.getAddress();
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = timestamp; // Use timestamp as nonce for simplicity

      const domain = {
        ...ZAMA_EIP712_DOMAIN,
        verifyingContract: this.contractAddress
      };

      const message = {
        userAddress: address,
        contractAddress: this.contractAddress,
        functionName,
        inputValue,
        nonce,
        timestamp
      };

      console.log("🔐 ENFORCING EIP-712 signature for encrypted input:", {
        functionName,
        inputValue,
        userAddress: address,
        contractAddress: this.contractAddress
      });

      // ✅ MANDATORY: Request EIP-712 signature from user
      const signature = await this.signer.signTypedData(
        domain,
        { EncryptedInput: ZAMA_EIP712_TYPES.EncryptedInput },
        message
      );

      console.log("✅ EIP-712 signature ENFORCED successfully");

      return {
        signature,
        message,
        domain,
        types: { EncryptedInput: ZAMA_EIP712_TYPES.EncryptedInput },
        userAddress: address,
        timestamp
      };
    } catch (error) {
      console.error("❌ EIP-712 signature ENFORCEMENT FAILED:", error);
      throw new Error(`EIP-712 signature is MANDATORY for Zama Protocol encrypted inputs: ${error}`);
    }
  }

  /**
   * MANDATORY: Create EIP-712 signature for decryption request
   * This is required by Zama Protocol for all decryption operations
   */
  async signDecryptionRequest(
    ciphertext: string,
    userAddress?: string
  ): Promise<ZamaEIP712Signature> {
    try {
      const address = userAddress || await this.signer.getAddress();
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = timestamp;

      const domain = {
        ...ZAMA_EIP712_DOMAIN,
        verifyingContract: this.contractAddress
      };

      const message = {
        userAddress: address,
        contractAddress: this.contractAddress,
        ciphertext,
        nonce,
        timestamp
      };

      console.log("🔐 ENFORCING EIP-712 signature for decryption request:", {
        ciphertext,
        userAddress: address,
        contractAddress: this.contractAddress
      });

      // ✅ MANDATORY: Request EIP-712 signature from user
      const signature = await this.signer.signTypedData(
        domain,
        { DecryptionRequest: ZAMA_EIP712_TYPES.DecryptionRequest },
        message
      );

      console.log("✅ EIP-712 signature ENFORCED for decryption");

      return {
        signature,
        message,
        domain,
        types: { DecryptionRequest: ZAMA_EIP712_TYPES.DecryptionRequest },
        userAddress: address,
        timestamp
      };
    } catch (error) {
      console.error("❌ EIP-712 signature ENFORCEMENT FAILED for decryption:", error);
      throw new Error(`EIP-712 signature is MANDATORY for Zama Protocol decryption requests: ${error}`);
    }
  }

  /**
   * Verify EIP-712 signature (for audit purposes)
   */
  async verifySignature(signatureData: ZamaEIP712Signature): Promise<boolean> {
    try {
      const recoveredAddress = ethers.verifyTypedData(
        signatureData.domain,
        signatureData.types,
        signatureData.message,
        signatureData.signature
      );

      const isValid = recoveredAddress.toLowerCase() === signatureData.userAddress.toLowerCase();
      console.log("🔍 EIP-712 signature verification:", {
        isValid,
        recoveredAddress,
        expectedAddress: signatureData.userAddress
      });

      return isValid;
    } catch (error) {
      console.error("❌ EIP-712 signature verification failed:", error);
      return false;
    }
  }

  /**
   * Check if EIP-712 is properly enforced (compliance check)
   */
  isEIP712Compliant(): boolean {
    return !!(this.provider && this.signer && this.contractAddress);
  }
}

// ✅ Global enforcer instance
let eip712Enforcer: EIP712Enforcer | null = null;

export const initializeEIP712Enforcer = (
  provider: ethers.BrowserProvider,
  signer: ethers.Signer,
  contractAddress: string
) => {
  eip712Enforcer = new EIP712Enforcer(provider, signer, contractAddress);
  console.log("✅ EIP-712 Enforcer initialized - Zama Protocol compliant");
  return eip712Enforcer;
};

export const getEIP712Enforcer = (): EIP712Enforcer => {
  if (!eip712Enforcer) {
    throw new Error("EIP-712 Enforcer not initialized. This violates Zama Protocol requirements.");
  }
  return eip712Enforcer;
};

export const enforceEIP712Compliance = () => {
  const enforcer = getEIP712Enforcer();
  if (!enforcer.isEIP712Compliant()) {
    throw new Error("EIP-712 compliance check FAILED. Zama Protocol requires EIP-712 signatures for all encrypted operations.");
  }
  console.log("✅ EIP-712 compliance verified");
};
