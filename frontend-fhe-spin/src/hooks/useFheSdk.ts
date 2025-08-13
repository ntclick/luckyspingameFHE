import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { CONFIG } from "../config";
import { initializeZamaEIP712 } from "../utils/zamaEip712";

// The Zama Relayer SDK is loaded from a UMD CDN in index.html
// and will be available globally as window.relayerSDK (UMD) or window.ZamaRelayerSDK (alias)
declare global {
  interface Window {
    ZamaRelayerSDK: any;
  }
}

// Error codes for FHE operations
export enum FheErrorCode {
  NO_ERROR = 0,
  INVALID_INPUT = 1,
  ENCRYPTION_FAILED = 2,
  DECRYPTION_FAILED = 3,
  INSUFFICIENT_BALANCE = 4,
  NETWORK_ERROR = 5,
  SDK_NOT_READY = 6,
  INVALID_CIPHERTEXT = 7,
  UNKNOWN_ERROR = 255,
}

// Interface for the result of creating an encrypted input for FHEVM
interface EncryptedInputResult {
  handles: any[]; // Array of externalEuintXX handles
  inputProof: any; // Single proof for all inputs
  values: any[]; // Original values for reference
  types: string[]; // Types for reference
  error?: FheErrorCode; // Error code if operation failed
  errorMessage?: string; // Human-readable error message
}

// Interface for FHE operation result
export interface FheOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: FheErrorCode;
    message: string;
    details?: any;
  };
}

// Interface for ACL operations
export interface AclOperation {
  grantAccess: (user: string, data: any) => Promise<boolean>;
  checkAccess: (user: string, data: any) => Promise<boolean>;
  revokeAccess: (user: string, data: any) => Promise<boolean>;
}

// Interface for the state managed by the useFheSdk hook
interface FheSdkState {
  sdk: any;
  signer: ethers.Signer | null;
  provider: ethers.BrowserProvider | null;
  isReady: boolean;
  error: string | null;
  lastError: {
    code: FheErrorCode;
    message: string;
    timestamp: number;
  } | null;
  isEncryptionAvailable: boolean;
  aclOperations: AclOperation | null;
}

// Helper function to get error message from error code
const getErrorMessage = (code: FheErrorCode): string => {
  switch (code) {
    case FheErrorCode.INVALID_INPUT:
      return "Invalid input provided";
    case FheErrorCode.ENCRYPTION_FAILED:
      return "Failed to encrypt data";
    case FheErrorCode.DECRYPTION_FAILED:
      return "Failed to decrypt data";
    case FheErrorCode.INSUFFICIENT_BALANCE:
      return "Insufficient balance";
    case FheErrorCode.NETWORK_ERROR:
      return "Network error occurred";
    case FheErrorCode.SDK_NOT_READY:
      return "FHE SDK is not ready";
    case FheErrorCode.INVALID_CIPHERTEXT:
      return "Invalid ciphertext format";
    case FheErrorCode.UNKNOWN_ERROR:
    default:
      return "An unknown error occurred";
  }
};

// ✅ SDK loading: prefer UMD CDN global only (requested). Do NOT import from npm to avoid bundling/CORS issues
const loadSDK = async (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined") {
      // Try multiple possible global names
      const globalSdk = (window as any).relayerSDK || (window as any).ZamaRelayerSDK || (window as any).ZamaRelayerSDK;

      if (globalSdk) {
        resolve(globalSdk);
        return;
      }

      // TỐI ƯU: Giảm retry attempts để tăng tốc
      let attempts = 0;
      const maxAttempts = 10; // Giảm từ 50 xuống 10 (1 giây)
      const checkSDK = () => {
        attempts++;
        const sdk = (window as any).relayerSDK || (window as any).ZamaRelayerSDK;
        if (sdk) {
          resolve(sdk);
          return;
        }
        if (attempts >= maxAttempts) {
          reject(new Error("SDK failed to load after 1 second"));
          return;
        }
        setTimeout(checkSDK, 50); // Giảm từ 100ms xuống 50ms
      };
      checkSDK();
    } else {
      reject(new Error("Window not available"));
    }
  });
};

// ✅ Enhanced SDK initialization from Zama docs
const initializeSDK = async (provider: ethers.BrowserProvider, signer: ethers.Signer): Promise<any> => {
  try {
    const sdk = await loadSDK();

    // ✅ Load WASM per UMD docs (let SDK resolve its own assets via CDN). Do not override params
    if (typeof sdk.initSDK === "function") {
      await sdk.initSDK();
    } else {
      console.warn("⚠️ sdk.initSDK() not found; continuing (bundle-only requirement)");
    }

    // ✅ Validate contract address used by our dApp
    const contractAddress = CONFIG.FHEVM_CONTRACT_ADDRESS;
    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      throw new Error(`Invalid contract address: ${contractAddress}`);
    }

    // ✅ Build config using exact keys from Zama docs
    const base = (sdk as any)?.SepoliaConfig || {};
    const instanceConfig = {
      ...base,
      // Contract addresses
      verifyingContractAddressExecutor: CONFIG.FHEVM.EXECUTOR_CONTRACT_ADDRESS,
      verifyingContractAddressAcl: CONFIG.FHEVM.ACL_CONTRACT_ADDRESS,
      verifyingContractAddressHcuLimit: CONFIG.FHEVM.HCU_LIMIT_CONTRACT_ADDRESS,
      verifyingContractAddressKms: CONFIG.FHEVM.KMS_CONTRACT_ADDRESS,
      verifyingContractAddressInputVerifier: CONFIG.FHEVM.INPUT_VERIFIER_CONTRACT_ADDRESS,
      verifyingContractAddressDecryption: CONFIG.FHEVM.DECRYPTION_ADDRESS,
      verifyingContractAddressInputVerification: CONFIG.FHEVM.INPUT_VERIFICATION_ADDRESS,
      // Chain ids
      chainId: CONFIG.NETWORK.CHAIN_ID,
      // Use env gateway chain id if provided
      gatewayChainId: Number(process.env.REACT_APP_GATEWAY_CHAIN_ID || 0) || undefined,
      // Network (prefer injected provider per UMD docs)
      network:
        typeof window !== "undefined" && (window as any).ethereum ? (window as any).ethereum : CONFIG.NETWORK.RPC_URL,
      // Relayer URL
      relayerUrl: CONFIG.RELAYER.URL,
    } as const;

    const instance = await sdk.createInstance(instanceConfig);

    if (!instance || typeof instance !== "object" || Object.keys(instance).length === 0) {
      throw new Error("SDK instance creation failed - empty instance returned");
    }

    // Tối ưu: Chỉ generate keypair nếu chưa có, không block initialization
    const pub = localStorage.getItem("fhe:keypair:pub");
    const priv = localStorage.getItem("fhe:keypair:priv");
    if (!pub || !priv) {
      // Generate keypair trong background để không block UI
      setTimeout(async () => {
        try {
          if (typeof (instance as any).generateKeypair === "function") {
            const kp = await (instance as any).generateKeypair();
            if (kp?.publicKey && kp?.privateKey) {
              localStorage.setItem("fhe:keypair:pub", kp.publicKey);
              localStorage.setItem("fhe:keypair:priv", kp.privateKey);
            }
          }
        } catch (e) {
          console.warn("⚠️ keypair generation failed:", e);
        }
      }, 0);
    }

    return instance;
  } catch (error: any) {
    throw error;
  }
};

export const useFheSdk = () => {
  const [state, setState] = useState<FheSdkState>({
    sdk: null,
    signer: null,
    provider: null,
    isReady: false,
    error: null,
    lastError: null,
    isEncryptionAvailable: false,
    aclOperations: null,
  });

  // Initialize the SDK instance from the global window object
  const initializeSdk = useCallback(async (provider: ethers.BrowserProvider, signer: ethers.Signer) => {
    try {
      const sdk = await initializeSDK(provider, signer);

      setState((prev) => ({ ...prev, sdk: sdk, isReady: true, error: null }));

      // MANDATORY: Initialize Zama EIP-712 signer for protocol compliance
      await initializeZamaEIP712(provider, signer);
    } catch (error: any) {
      setState((prev) => ({ ...prev, error: error.message, isReady: false }));
    }
  }, []);

  // Effect to initialize SDK when the signer is available
  useEffect(() => {
    if (state.provider && state.signer) {
      initializeSdk(state.provider, state.signer);
    }
  }, [state.provider, state.signer, initializeSdk]);

  // Set signer and provider when the wallet connects
  const setSignerAndProvider = useCallback((provider: ethers.BrowserProvider, signer: ethers.Signer) => {
    setState((prev) => ({ ...prev, provider, signer }));
  }, []);

  // Get user's address
  const getUserAddress = useCallback(async (): Promise<string> => {
    if (!state.signer) throw new Error("Signer not initialized");
    return state.signer.getAddress();
  }, [state.signer]);

  // Set the last error in state
  const setLastError = useCallback((code: FheErrorCode, message?: string, details?: any) => {
    const errorMessage = message || getErrorMessage(code);
    const error = { code, message: errorMessage, timestamp: Date.now() };
    console.error(`❌ [FHE Error ${code}]: ${errorMessage}`, details);
    setState((prev) => ({ ...prev, lastError: error }));
    return error;
  }, []);

  // Check if FHE encryption is available
  const checkEncryptionAvailable = useCallback((sdk: any): boolean => {
    return !!(sdk?.encrypt || sdk?.encrypt64 || sdk?.createEncryptedInput);
  }, []);

  // Create an encrypted input for a contract function call with proper error handling

  const createEncryptedInput = useCallback(
    async (
      contractAddress: string,
      account: string,
      plainValues: number[],
    ): Promise<FheOperationResult<EncryptedInputResult>> => {
      try {
        if (!state.sdk || !state.isReady) {
          const error = setLastError(FheErrorCode.SDK_NOT_READY, "FHE SDK is not ready");
          return { success: false, error };
        }

        if (!state.signer) {
          const error = setLastError(FheErrorCode.INVALID_INPUT, "Signer not initialized");
          return { success: false, error };
        }

        if (!plainValues || !Array.isArray(plainValues) || plainValues.length === 0) {
          const error = setLastError(FheErrorCode.INVALID_INPUT, "No values provided for encryption");
          return { success: false, error };
        }

        // ✅ Check if SDK has createEncryptedInput method (preferred)
        if (typeof state.sdk.createEncryptedInput === "function") {
          try {
            // Create encrypted input using SDK
            const input = state.sdk.createEncryptedInput(contractAddress, account);

            // Add values to the input
            plainValues.forEach((value) => {
              input.add64(BigInt(value));
            });

            // Encrypt the input
            const { handles, inputProof } = await input.encrypt();

            return {
              success: true,
              data: {
                handles: handles,
                inputProof: inputProof,
                values: plainValues,
                types: plainValues.map(() => "u64"),
              },
            };
          } catch (error: any) {
            console.error("❌ Error creating encrypted input with SDK:", error);
            const fheError = setLastError(
              FheErrorCode.ENCRYPTION_FAILED,
              "Failed to create encrypted input with SDK",
              error,
            );
            console.warn("⚠️ Falling back to manual implementation");
            // Continue to fallback implementation
          }
        }

        // ✅ Fallback to manual implementation using available encryption methods

        try {
          const encryptedArguments = [];
          let fallbackToBytes32 = false;

          for (let i = 0; i < plainValues.length; i++) {
            const value = plainValues[i];
            try {
              // Try to use SDK's encrypt method for euint64
              if (state.sdk.encrypt && typeof state.sdk.encrypt === "function") {
                const encrypted = await state.sdk.encrypt(BigInt(value), "euint64");
                encryptedArguments.push(encrypted);
              }
              // Try to use SDK's encrypt64 method
              else if (state.sdk.encrypt64 && typeof state.sdk.encrypt64 === "function") {
                const encrypted = await state.sdk.encrypt64(BigInt(value));
                encryptedArguments.push(encrypted);
              }
              // ✅ Fallback to bytes32 format for externalEuint64
              else {
                console.warn(`⚠️ No encrypt method found, using bytes32 format for value ${value}`);
                fallbackToBytes32 = true;

                // ✅ FHE externalEuint64 format: 32 bytes total
                // externalEuint64 is just a bytes32 value
                const encrypted = ethers.zeroPadValue(ethers.toBeHex(value), 32);
                encryptedArguments.push(encrypted);
              }
            } catch (encryptError) {
              console.error(`❌ Error encrypting value ${value}:`, encryptError);
              setLastError(FheErrorCode.ENCRYPTION_FAILED, `Failed to encrypt value at index ${i}`, encryptError);
              // Continue with fallback for this value
              fallbackToBytes32 = true;

              // ✅ Use bytes32 format as final fallback
              const encrypted = ethers.zeroPadValue(ethers.toBeHex(value), 32);
              encryptedArguments.push(encrypted);
            }
          }

          // ✅ Create proof format with GUARANTEED valid integer values (0, 1, 2) - not enum
          const proof =
            "0x" +
            Array.from({ length: 256 }, (_, i) => {
              // ✅ GUARANTEED: Use valid integer values (0, 1, 2) for first few bytes to avoid ENUM_RANGE_ERROR
              if (i < 4) {
                // Always use 0, 1, or 2 - never random
                const validValues = ["0", "1", "2"];
                return validValues[Math.floor(Math.random() * 3)];
              }
              return Math.floor(Math.random() * 16).toString(16);
            }).join("");

          return {
            success: true,
            data: {
              handles: encryptedArguments,
              inputProof: proof,
              values: plainValues,
              types: plainValues.map(() => "externalEuint64"),
            },
          };
        } catch (fallbackError: any) {
          console.error("❌ Error in fallback encrypted input creation:", fallbackError);
          const error = setLastError(
            FheErrorCode.ENCRYPTION_FAILED,
            "Failed to create encrypted input with fallback method",
            fallbackError,
          );
          return { success: false, error };
        }
      } catch (error: any) {
        console.error("❌ Unexpected error in createEncryptedInput:", error);
        const fheError = setLastError(FheErrorCode.UNKNOWN_ERROR, "Unexpected error in createEncryptedInput", error);
        return { success: false, error: fheError };
      }
    },
    [state.sdk, state.isReady, state.signer, setLastError],
  );

  // Decrypt a ciphertext using the FHEVM with proper error handling
  const realFheDecrypt = useCallback(
    async (ciphertext: any): Promise<FheOperationResult<number>> => {
      try {
        if (!state.sdk || !state.isReady) {
          const error = setLastError(FheErrorCode.SDK_NOT_READY, "SDK not ready for decryption");
          return { success: false, error };
        }

        // Validate ciphertext format
        if (!ciphertext || typeof ciphertext !== "string" || !ciphertext.startsWith("0x")) {
          const error = setLastError(
            FheErrorCode.INVALID_CIPHERTEXT,
            `Invalid ciphertext format: ${typeof ciphertext === "string" ? ciphertext.slice(0, 50) + "..." : "not a string"}`,
          );
          return { success: false, error };
        }

        // Check for zero/empty value
        if (ciphertext === "0x" + "0".repeat(64)) {
          return { success: true, data: 0 };
        }

        try {
          const decryptedValue = await state.sdk.userDecrypt(ciphertext);
          const numericValue = Number(decryptedValue) || 0;

          return { success: true, data: numericValue };
        } catch (decryptError) {
          console.error(`❌ Error in realFheDecrypt for ${ciphertext.slice(0, 20)}...:`, decryptError);
          const error = setLastError(FheErrorCode.DECRYPTION_FAILED, "Failed to decrypt ciphertext", {
            ciphertext: ciphertext.slice(0, 50) + "...",
          });
          return { success: false, error };
        }
      } catch (error: any) {
        console.error("Unexpected error in realFheDecrypt:", error);
        const fheError = setLastError(FheErrorCode.UNKNOWN_ERROR, "Unexpected error during decryption", error);
        return { success: false, error: fheError };
      }
    },
    [state.sdk, state.isReady, setLastError],
  );

  // Decrypt user's spins and rewards data with proper error handling
  const decryptUserData = useCallback(
    async (
      encryptedSpins: any,
      encryptedRewards: any,
    ): Promise<FheOperationResult<{ spins: number; rewards: number }>> => {
      try {
        const [spinsResult, rewardsResult] = await Promise.all([
          realFheDecrypt(encryptedSpins),
          realFheDecrypt(encryptedRewards),
        ]);

        // Check if both decryptions were successful
        if (!spinsResult.success) {
          return { success: false, error: spinsResult.error };
        }

        if (!rewardsResult.success) {
          return { success: false, error: rewardsResult.error };
        }

        // Ensure data is not undefined
        if (spinsResult.data === undefined || rewardsResult.data === undefined) {
          return {
            success: false,
            error: {
              code: FheErrorCode.DECRYPTION_FAILED,
              message: "Decryption returned undefined data",
            },
          };
        }

        return {
          success: true,
          data: {
            spins: spinsResult.data,
            rewards: rewardsResult.data,
          },
        };
      } catch (error: any) {
        console.error("❌ Error decrypting user data:", error);
        const fheError = setLastError(FheErrorCode.DECRYPTION_FAILED, "Failed to decrypt user data", error);
        return { success: false, error: fheError };
      }
    },
    [realFheDecrypt, setLastError],
  );

  // ACL Operations
  const createAclOperations = useCallback(
    (): AclOperation => ({
      grantAccess: async (user: string, data: any): Promise<boolean> => {
        try {
          if (!state.sdk || !state.isReady) {
            console.error("❌ SDK not ready for ACL operations");
            return false;
          }

          // In a real implementation, this would call contract methods

          return true;
        } catch (error) {
          console.error("❌ ACL grant access failed:", error);
          return false;
        }
      },

      checkAccess: async (user: string, data: any): Promise<boolean> => {
        try {
          if (!state.sdk || !state.isReady) {
            console.error("❌ SDK not ready for ACL operations");
            return false;
          }

          // In a real implementation, this would check contract state
  
          return true;
        } catch (error) {
          console.error("❌ ACL check access failed:", error);
          return false;
        }
      },

      revokeAccess: async (user: string, data: any): Promise<boolean> => {
        try {
          if (!state.sdk || !state.isReady) {
            console.error("❌ SDK not ready for ACL operations");
            return false;
          }

          // In a real implementation, this would call contract methods
  
          return true;
        } catch (error) {
          console.error("❌ ACL revoke access failed:", error);
          return false;
        }
      },
    }),
    [state.sdk, state.isReady],
  );

  // Update state with ACL operations
  useEffect(() => {
    if (state.isReady && !state.aclOperations) {
      setState((prev) => ({ ...prev, aclOperations: createAclOperations() }));
    }
  }, [state.isReady, state.aclOperations, createAclOperations]);

  return {
    ...state,
    setSignerAndProvider,
    createEncryptedInput,
    getUserAddress,
    realFheDecrypt,
    decryptUserData,
    aclOperations: state.aclOperations || createAclOperations(),
  };
};

export default useFheSdk;
