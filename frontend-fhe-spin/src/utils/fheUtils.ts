import { ethers } from "ethers";
import { CONFIG } from "../config";
import { signClaimAttestation } from "./eip712Signer";

// ✅ LuckySpinFHE_KMS_Final ABI - FHEVM compatible with KMS callback (Updated)
import LuckySpinFHE_KMS_Final_abi from "../abi/LuckySpinFHE_KMS_Final.json";
const LuckySpinFHE_abi = LuckySpinFHE_KMS_Final_abi.abi;
/*
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "hasPendingClaim",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getClaimRequest",
    outputs: [
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  { inputs: [], name: "buyGmTokens", outputs: [], stateMutability: "payable", type: "function" },
  {
    inputs: [
      { internalType: "externalEuint64", name: "encryptedAmount", type: "bytes32" },
      { internalType: "bytes", name: "proof", type: "bytes" },
    ],
    name: "buyGmTokensFHE",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "buySpinWithGm",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint64", name: "count", type: "uint64" }],
    name: "buySpinWithGmBatch",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Removed legacy functions not present in Strict contract (buySpins, canGmToday, etc.)
  {
    inputs: [],
    name: "dailyGm",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "emergencyWithdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getContractBalance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  // Strict exposes lastCheckInDay/Time
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastCheckInDay",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastCheckInTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserRewards",
    outputs: [{ internalType: "euint256", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "getUserGmBalance",
    outputs: [
      {
        internalType: "euint64",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getEncryptedScore",
    outputs: [{ internalType: "euint64", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getEncryptedLastSlot",
    outputs: [{ internalType: "euint64", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getEncryptedPendingEthWei",
    outputs: [{ internalType: "euint64", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getEncryptedUserBundle",
    outputs: [
      { internalType: "euint64", name: "spins", type: "bytes32" },
      { internalType: "euint64", name: "gm", type: "bytes32" },
      { internalType: "euint64", name: "pendingEthWei", type: "bytes32" },
      { internalType: "euint64", name: "lastSlot", type: "bytes32" },
      { internalType: "euint64", name: "score", type: "bytes32" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "stateVersion",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "version", type: "uint256" },
    ],
    name: "UserStateChanged",
    type: "event",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getLastError",
    outputs: [
      { internalType: "euint8", name: "code", type: "bytes32" },
      { internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "getUserSpins",
    outputs: [
      {
        internalType: "euint64",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  // removed lastGmTime
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "attestor",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newAttestor", type: "address" }],
    name: "setAttestor",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "score", type: "uint256" }],
    name: "publishScore",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  { inputs: [], name: "unpublishScore", outputs: [], stateMutability: "nonpayable", type: "function" },
  {
    inputs: [
      { internalType: "uint256", name: "offset", type: "uint256" },
      { internalType: "uint256", name: "limit", type: "uint256" },
    ],
    name: "getPublishedRange",
    outputs: [
      { internalType: "address[]", name: "addrs", type: "address[]" },
      { internalType: "uint256[]", name: "scores", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "isScorePublished",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getPublicScore",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "claimNonce",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "spin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "spinLite",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint8", name: "slot", type: "uint8" }],
    name: "settlePrize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "spinNonce",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastOutcomeCommit",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "pendingSettlement",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "userRewards",
    outputs: [
      {
        internalType: "euint256",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "userSpins",
    outputs: [
      {
        internalType: "euint64",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    stateMutability: "payable",
    type: "receive",
  },
*/

const SPIN_OUTCOME_SIG = "SpinOutcome(address,uint8,uint256,uint64)";

// Cache type for user-decryption signature/session
type UdsigCache = {
  signature: string;
  start: string;
  durationDays: string;
  contract: string;
  publicKey: string;
  expiresAt: number;
};

// Add cooldown and single-flight protection
// legacy cooldown variables removed

// ✅ FHE Utils theo chuẩn FHEVM với ABI chuẩn
export class FheUtils {
  sdk: any;
  contract: ethers.Contract;
  provider: ethers.BrowserProvider;
  signer: ethers.Signer;
  private cachedKeypair?: { publicKey: string; privateKey: string };
  private cachedUdsig?: UdsigCache;

  constructor(sdk: any, provider: ethers.BrowserProvider, signer: ethers.Signer) {
    this.sdk = sdk;
    this.provider = provider;
    this.signer = signer;

    // ✅ Validate signer
    if (!signer) {
      throw new Error("Signer is required for FHE Utils initialization");
    }

    // ✅ Validate provider
    if (!provider) {
      throw new Error("Provider is required for FHE Utils initialization");
    }

    // ✅ Use CONFIG for contract address to avoid missing env vars
    const contractAddress = CONFIG.FHEVM_CONTRACT_ADDRESS;
    if (!contractAddress) {
      throw new Error("FHEVM_CONTRACT_ADDRESS missing from CONFIG");
    }

    this.contract = new ethers.Contract(contractAddress, LuckySpinFHE_abi, signer);
  }

  // ===== Helpers: cache keypair and EIP-712 user-decrypt authorization =====
  private async ensureKeypairCached(): Promise<{ publicKey: string; privateKey: string }> {
    if (this.cachedKeypair) return this.cachedKeypair;
    try {
      const pub = localStorage.getItem("fhe:keypair:pub");
      const priv = localStorage.getItem("fhe:keypair:priv");
      if (pub && priv) {
        this.cachedKeypair = { publicKey: pub, privateKey: priv };
        return this.cachedKeypair;
      }
    } catch {}
    const kp = await this.sdk.generateKeypair();
    try {
      localStorage.setItem("fhe:keypair:pub", kp.publicKey);
      localStorage.setItem("fhe:keypair:priv", kp.privateKey);
    } catch {}
    this.cachedKeypair = kp;
    return kp;
  }

  private getDailyBucketStart(nowMs: number): number {
    const secs = Math.floor(nowMs / 1000);
    return Math.floor(secs / 86400) * 86400; // 00:00 UTC
  }

  private async getUserDecryptAuth(contractAddress: string): Promise<{
    signature: string; // no 0x
    startTimeStamp: string;
    durationDays: string;
    contracts: string[];
    keypair: { publicKey: string; privateKey: string };
  }> {
    const keypair = await this.ensureKeypairCached();
    const now = Date.now();
    const startBucket = this.getDailyBucketStart(now);
    const durationDays = "10";
    const expiresAt = startBucket + parseInt(durationDays, 10) * 86400 - 60; // 60s skew
    const addr = (await this.signer.getAddress()).toLowerCase();
    // Use the same cache key format as getCachedUserDecryptAuth
    const cacheKey = `fhe:udsig:${addr}:${contractAddress}:${keypair.publicKey}`;
    try {
      const cachedStr = localStorage.getItem(cacheKey);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr) as UdsigCache;
        if (
          cached &&
          cached.contract?.toLowerCase() === contractAddress.toLowerCase() &&
          cached.publicKey === keypair.publicKey &&
          cached.expiresAt &&
          cached.expiresAt > Math.floor(now / 1000)
        ) {
          this.cachedUdsig = cached;
          return {
            signature: cached.signature,
            startTimeStamp: cached.start,
            durationDays: cached.durationDays,
            contracts: [contractAddress],
            keypair,
          };
        }
      }
    } catch {}

    const startTimeStamp = String(startBucket);
    const contracts = [contractAddress];
    const eip712 = await this.sdk.createEIP712(keypair.publicKey, contracts, startTimeStamp, durationDays);
    const sig = await (this.signer as any).signTypedData(
      eip712.domain,
      { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
      eip712.message,
    );
    const signatureNo0x = String(sig).replace(/^0x/, "");
    const toCache: UdsigCache = {
      signature: signatureNo0x,
      start: startTimeStamp,
      durationDays,
      contract: contractAddress,
      publicKey: keypair.publicKey,
      expiresAt: expiresAt,
    };
    this.cachedUdsig = toCache;
    try {
      localStorage.setItem(cacheKey, JSON.stringify(toCache));
    } catch {}
    return { signature: signatureNo0x, startTimeStamp, durationDays, contracts, keypair };
  }

  // Cached-only read to avoid prompting wallet automatically
  private async getCachedUserDecryptAuth(contractAddress: string): Promise<{
    signature: string; // no 0x
    startTimeStamp: string;
    durationDays: string;
    contracts: string[];
    keypair: { publicKey: string; privateKey: string };
  } | null> {
    const keypair = await this.ensureKeypairCached();
    const addr = (await this.signer.getAddress()).toLowerCase();
    const now = Date.now();
    const cacheKey = `fhe:udsig:${addr}:${contractAddress}:${keypair.publicKey}`;
    try {
      const cachedStr = localStorage.getItem(cacheKey);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr) as UdsigCache;
        if (
          cached &&
          cached.contract?.toLowerCase() === contractAddress.toLowerCase() &&
          cached.publicKey === keypair.publicKey &&
          cached.expiresAt &&
          cached.expiresAt > Math.floor(now / 1000)
        ) {
          return {
            signature: cached.signature,
            startTimeStamp: cached.start,
            durationDays: cached.durationDays,
            contracts: [contractAddress],
            keypair,
          };
        }
      }
    } catch {}
    return null;
  }

  // Explicit request to authorize user decryption (should be called on user interaction)
  async requestUserDecryptAuthorization(): Promise<boolean> {
    try {
      const addr = await this.signer.getAddress();
      const contractAddress = this.contract.target as string;

      await this.getUserDecryptAuth(contractAddress);
      return true;
    } catch (e) {
      return false;
    }
  }

  async hasCachedDecryptAuth(): Promise<boolean> {
    try {
      const contractAddress = this.contract.target as string;
      const cached = await this.getCachedUserDecryptAuth(contractAddress);
      return !!cached;
    } catch {
      return false;
    }
  }

  // ✅ Tạo encrypted input cho buySpins với ABI chuẩn và EIP-712 signature
  async createBuySpinsInput(amount: number) {
    try {
      if (!this.sdk) throw new Error("SDK not initialized");
      const builder = this.sdk.createEncryptedInput(this.contract.target as string, await this.signer.getAddress());
      builder.add64(BigInt(amount));
      const { handles, inputProof } = await builder.encrypt();
      if (!handles?.length) throw new Error("No handles returned from encrypted input");
      return { handles, inputProof, values: [amount], types: ["u64"] } as any;
    } catch (error) {
      throw error;
    }
  }

  // ✅ Decrypt user spins với ABI chuẩn
  async decryptUserSpins(address: string): Promise<number> {
    try {
      const encryptedSpins = await this.contract.getUserSpins(address);

      // ✅ Sử dụng SDK instance để decrypt
      if (!this.sdk) {
        throw new Error("SDK not initialized");
      }

      // ✅ Validate ciphertext format - kiểm tra kỹ hơn
      if (!encryptedSpins || typeof encryptedSpins !== "string") {
        return 0;
      }

      // ✅ Check if ciphertext is zero/empty/undefined
      if (
        encryptedSpins === "0x0000000000000000000000000000000000000000000000000000000000000000" ||
        encryptedSpins === "0x" ||
        encryptedSpins === "" ||
        encryptedSpins === undefined ||
        encryptedSpins === null
      ) {
        return 0;
      }

      // ✅ Validate hex format
      if (!encryptedSpins.match(/^0x[0-9a-fA-F]+$/)) {
        return 0;
      }

      const v = await this.decryptEuint64(encryptedSpins);
      return Number(v) || 0;
    } catch (error) {
      return 0;
    }
  }

  // ✅ Decrypt user rewards với ABI chuẩn
  async decryptUserRewards(address: string): Promise<number> {
    try {
      const encryptedRewards = await this.contract.getUserRewards(address);

      // ✅ Sử dụng SDK instance để decrypt
      if (!this.sdk) {
        throw new Error("SDK not initialized");
      }

      // ✅ Validate ciphertext format - kiểm tra kỹ hơn
      if (!encryptedRewards || typeof encryptedRewards !== "string") {
        return 0;
      }

      // ✅ Check if ciphertext is zero/empty/undefined
      if (
        encryptedRewards === "0x0000000000000000000000000000000000000000000000000000000000000000" ||
        encryptedRewards === "0x" ||
        encryptedRewards === "" ||
        encryptedRewards === undefined ||
        encryptedRewards === null
      ) {
        return 0;
      }

      // ✅ Validate hex format
      if (!encryptedRewards.match(/^0x[0-9a-fA-F]+$/)) {
        return 0;
      }

      const contractAddress = this.contract.target as string;
      const cachedAuth = await this.getCachedUserDecryptAuth(contractAddress);
      if (!cachedAuth) {
        // Do not trigger wallet; return 0 until user explicitly authorizes
        return 0;
      }
      const pairs = [{ handle: encryptedRewards, contractAddress }];
      const result = await this.sdk.userDecrypt(
        pairs,
        cachedAuth.keypair.privateKey,
        cachedAuth.keypair.publicKey,
        cachedAuth.signature,
        cachedAuth.contracts,
        await this.signer.getAddress(),
        cachedAuth.startTimeStamp,
        cachedAuth.durationDays,
      );
      const val = result?.[encryptedRewards];
      const n =
        typeof val === "bigint"
          ? val
          : typeof val === "number"
            ? BigInt(val)
            : typeof val === "string" && /^\d+$/.test(val)
              ? BigInt(val)
              : 0n;
      const asNum = n <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(n) : 0;
      return asNum;
    } catch (error) {
      return 0;
    }
  }

  // ✅ Decrypt user GM balance
  async decryptUserGm(address: string): Promise<number> {
    try {
      const encryptedGm = await this.contract.getUserGmBalance(address);
      if (!encryptedGm || typeof encryptedGm !== "string" || !encryptedGm.startsWith("0x")) return 0;
      const v = await this.decryptEuint64(encryptedGm);
      return Number(v) || 0;
    } catch {
      return 0;
    }
  }

  // Add cooldown and single-flight protection
  private static decryptCooldown = 0; // Tắt cooldown để test
  private static decryptPromise: Promise<any> | null = null;

  // Public methods to manage cooldown
  static isDecryptInCooldown(): boolean {
    return FheUtils.decryptCooldown > 0;
  }

  static setDecryptCooldown(value: boolean): void {
    FheUtils.decryptCooldown = value ? 50 : 0; // TỐI ƯU: Giảm xuống 50ms
  }

  static async waitForCooldown(): Promise<void> {
    if (FheUtils.decryptCooldown > 0) {
      await new Promise((resolve) => setTimeout(resolve, FheUtils.decryptCooldown));
      FheUtils.decryptCooldown = 0;
    }
  }

  static isInCooldown(): boolean {
    return FheUtils.decryptCooldown > 0;
  }

  // ACL management functions
  async checkAclStatus(): Promise<{ hasAccess: boolean; lastCheckIn: number; canCheckIn: boolean }> {
    try {
      const address = await this.signer.getAddress();
      // Some contract variants may not expose lastCheckInDay or bundle API
      let lastCheckIn = 0n;
      try {
        if (typeof (this.contract as any).lastCheckInDay === "function") {
          lastCheckIn = await (this.contract as any).lastCheckInDay(address);
        }
      } catch {}
      const nowDay = Math.floor(Date.now() / 86400000); // UTC day
      const canCheckIn = nowDay > Number(lastCheckIn);

      // Try bundle, fallback to individual getters when missing
      let hasActivity = false;
      try {
        if (typeof (this.contract as any).getEncryptedUserBundle === "function") {
          const bundle = await (this.contract as any).getEncryptedUserBundle(address);
          hasActivity = Boolean(
            bundle &&
              (bundle.spins !== "0x" + "0".repeat(64) ||
                bundle.gm !== "0x" + "0".repeat(64) ||
                bundle.pendingEthWei !== "0x" + "0".repeat(64)),
          );
        } else {
          const spins = await (this.contract as any).getUserSpins?.(address);
          const gm = await (this.contract as any).getUserGmBalance?.(address);
          hasActivity = Boolean(
            (typeof spins === "string" && spins !== "0x" + "0".repeat(64)) ||
              (typeof gm === "string" && gm !== "0x" + "0".repeat(64)),
          );
        }
      } catch {}

      return {
        hasAccess: hasActivity || !canCheckIn,
        lastCheckIn: Number(lastCheckIn),
        canCheckIn,
      };
    } catch (error) {
      return { hasAccess: false, lastCheckIn: 0, canCheckIn: true };
    }
  }

  async repairAcl(): Promise<boolean> {
    try {
      const aclStatus = await this.checkAclStatus();

      if (aclStatus.canCheckIn && typeof (this.contract as any).checkIn === "function") {
        const tx = await (this.contract as any).checkIn();
        await tx.wait();

        return true;
      }

      await this.buySpinWithGm(1);

      return true;
    } catch (error) {
      return false;
    }
  }

  // Auto-fix based on diagnostic results
  async autoFixIssues(diagnostic: any): Promise<{
    success: boolean;
    actions: string[];
    errors: string[];
  }> {
    const actions: string[] = [];
    const errors: string[] = [];

    try {
      // 1. Fix keypair issues
      if (!diagnostic.keypairValid) {
        try {
          this.cachedKeypair = undefined;
          localStorage.removeItem("fhe_keypair");
          await this.ensureKeypairCached();
          actions.push("Regenerated keypair");
        } catch (e) {
          errors.push(`Keypair fix failed: ${e}`);
        }
      }

      // 2. Fix ACL issues
      if (!diagnostic.aclUserGranted) {
        try {
          const success = await this.repairAcl();
          if (success) {
            actions.push("Repaired ACL access");
          } else {
            errors.push("ACL repair failed");
          }
        } catch (e) {
          errors.push(`ACL fix failed: ${e}`);
        }
      }

      // 3. Fix chain ID issues
      if (!diagnostic.chainIdValid) {
        try {
          const anyWindow = window as any;
          await anyWindow.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x" + CONFIG.NETWORK.CHAIN_ID.toString(16) }],
          });
          actions.push("Switched to correct network");
        } catch (e) {
          errors.push(`Network switch failed: ${e}`);
        }
      }

      return {
        success: errors.length === 0,
        actions,
        errors,
      };
    } catch (error) {
      return {
        success: false,
        actions,
        errors: [`Auto-fix failed: ${error}`],
      };
    }
  }

  // Comprehensive ACL and keypair diagnostic
  async diagnoseDecryptIssues(): Promise<{
    aclUserGranted: boolean;
    aclRelayerGranted: boolean;
    keypairValid: boolean;
    relayerUrlValid: boolean;
    contractAddressValid: boolean;
    chainIdValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      const address = await this.signer.getAddress();
      const contractAddress = this.contract.target as string;

      // 1. Check ACL permissions (skip if ACL contract disabled)

      let aclUserGranted = true;
      let aclRelayerGranted = true;

      // Check ACL permissions
      try {
        const aclContract = new ethers.Contract(
          CONFIG.FHEVM.ACL_CONTRACT_ADDRESS,
          ["function hasDecryptionKey(address) view returns (bool)"],
          this.provider,
        );

        aclUserGranted = await aclContract.hasDecryptionKey(address);
        aclRelayerGranted = await aclContract.hasDecryptionKey(CONFIG.FHEVM.DECRYPTION_ADDRESS);

        if (!aclUserGranted) {
          issues.push("User not granted decryption key in ACL");
          recommendations.push("Perform daily check-in or buy spins to gain ACL access");
        }

        if (!aclRelayerGranted) {
          issues.push("Relayer not granted decryption key in ACL");
          recommendations.push("Contact admin to grant relayer access");
        }
      } catch (e) {
        issues.push("ACL contract call reverted - may need user activity");
        recommendations.push("Try daily check-in or buy spins to activate ACL");

        // Set to false when ACL call reverts (assume no access)
        aclUserGranted = false;
        aclRelayerGranted = false;
      }

      // 2. Check keypair validity

      let keypairValid = false;
      try {
        const keypair = this.cachedKeypair;
        if (keypair && keypair.publicKey && keypair.privateKey) {
          // Try to use keypair to verify it's valid
          const testAuth = await this.getCachedUserDecryptAuth(contractAddress);
          keypairValid = !!testAuth;
        }

        if (!keypairValid) {
          issues.push("Keypair invalid or missing");
          recommendations.push("Clear keypair and re-generate");
        }
      } catch (e) {
        issues.push("Keypair validation failed");
        recommendations.push("Clear keypair and re-generate");
      }

      // 3. Check relayer health via SDK (avoids CORS/path issues)

      let relayerUrlValid = false;
      try {
        // Prefer SDK method if available
        const getPk = this.sdk?.getPublicKey || this.sdk?.getPublicParams;
        if (typeof getPk === "function") {
          const pk = await getPk.call(this.sdk);
          relayerUrlValid = !!pk;
        } else {
          // Fallback: attempt a lightweight decrypt public method if exposed
          relayerUrlValid = true; // Assume OK when SDK lacks probing API
        }

        if (!relayerUrlValid) {
          issues.push("Relayer not reachable via SDK");
          recommendations.push("Verify relayer URL and network connectivity");
        }
      } catch (e) {
        issues.push("Relayer SDK check failed");
        recommendations.push("Check relayer configuration or try again later");
      }

      // 4. Check contract address

      let contractAddressValid = false;
      try {
        const code = await this.provider.getCode(contractAddress);
        contractAddressValid = code !== "0x";

        if (!contractAddressValid) {
          issues.push("Contract address invalid");
          recommendations.push("Check REACT_APP_FHEVM_CONTRACT_ADDRESS");
        }
      } catch (e) {
        issues.push("Contract address check failed");
        recommendations.push("Check REACT_APP_FHEVM_CONTRACT_ADDRESS");
      }

      // 5. Check chain ID

      let chainIdValid = false;
      try {
        const network = await this.provider.getNetwork();
        chainIdValid = Number(network.chainId) === CONFIG.NETWORK.CHAIN_ID;

        if (!chainIdValid) {
          issues.push("Chain ID mismatch");
          recommendations.push("Switch to correct network (Sepolia)");
        }
      } catch (e) {
        issues.push("Chain ID check failed");
        recommendations.push("Check network connection");
      }

      return {
        aclUserGranted: !issues.includes("User not granted decryption key in ACL"),
        aclRelayerGranted: !issues.includes("Relayer not granted decryption key in ACL"),
        keypairValid,
        relayerUrlValid,
        contractAddressValid,
        chainIdValid,
        issues,
        recommendations,
      };
    } catch (error) {
      return {
        aclUserGranted: false,
        aclRelayerGranted: false,
        keypairValid: false,
        relayerUrlValid: false,
        contractAddressValid: false,
        chainIdValid: false,
        issues: ["Diagnostic failed"],
        recommendations: ["Check console for errors"],
      };
    }
  }

  async decryptEuint64(ciphertext: string): Promise<bigint> {
    // ✅ Sử dụng SDK instance để decrypt
    if (!this.sdk) throw new Error("SDK not initialized");
    if (!ciphertext || typeof ciphertext !== "string" || !ciphertext.startsWith("0x")) return 0n;
    if (ciphertext === "0x" + "0".repeat(64)) return 0n;

    // Thử decrypt với cached auth trước
    try {
      const contractAddress = this.contract.target as string;
      const cachedAuth = await this.getCachedUserDecryptAuth(contractAddress);
      if (cachedAuth) {
        const handleContractPairs = [{ handle: ciphertext, contractAddress }];
        const result = await this.sdk.userDecrypt(
          handleContractPairs,
          cachedAuth.keypair.privateKey,
          cachedAuth.keypair.publicKey,
          cachedAuth.signature,
          cachedAuth.contracts,
          await this.signer.getAddress(),
          cachedAuth.startTimeStamp,
          cachedAuth.durationDays,
        );
        const val = result?.[ciphertext];
        if (typeof val === "bigint") return val;
        if (typeof val === "number") return BigInt(val);
        if (typeof val === "string" && /^\d+$/.test(val)) return BigInt(val);
      }
    } catch (e: any) {}

    // Fallback: thử tạo auth mới nếu không có cached
    try {
      const contractAddress = this.contract.target as string;
      const auth = await this.getUserDecryptAuth(contractAddress);
      const handleContractPairs = [{ handle: ciphertext, contractAddress }];
      const result = await this.sdk.userDecrypt(
        handleContractPairs,
        auth.keypair.privateKey,
        auth.keypair.publicKey,
        auth.signature,
        auth.contracts,
        await this.signer.getAddress(),
        auth.startTimeStamp,
        auth.durationDays,
      );
      const val = result?.[ciphertext];
      if (typeof val === "bigint") return val;
      if (typeof val === "number") return BigInt(val);
      if (typeof val === "string" && /^\d+$/.test(val)) return BigInt(val);
    } catch (e: any) {}

    // Return 0 if all decrypt attempts fail
    return 0n;
  }

  // Decrypt multiple values in one call (optimized) - theo chuẩn Zama
  async decryptMultipleValues(
    handleContractPairs: Array<{ handle: string; contractAddress: string }>,
  ): Promise<Record<string, bigint>> {
    if (!this.sdk) throw new Error("SDK not initialized");
    if (!handleContractPairs.length) return {};

    const address = await this.signer.getAddress();
    const contractAddress = this.contract.target as string;
    const cachedAuth = await this.getCachedUserDecryptAuth(contractAddress);

    if (!cachedAuth) {
      return {};
    }

    // Single-flight protection
    if (FheUtils.decryptPromise) {
      await FheUtils.decryptPromise;
    }

    // Cooldown check - giảm cooldown để load nhanh hơn
    if (FheUtils.decryptCooldown > 0) {
      return {};
    }

    const decryptPromise = (async () => {
      try {
        // Sử dụng logic chuẩn Zama như trong ví dụ
        const result = await this.sdk.userDecrypt(
          handleContractPairs,
          cachedAuth.keypair.privateKey,
          cachedAuth.keypair.publicKey,
          cachedAuth.signature,
          cachedAuth.contracts,
          address,
          cachedAuth.startTimeStamp,
          cachedAuth.durationDays,
        );

        // Convert result to bigint format
        const bigintResult: Record<string, bigint> = {};
        for (const [handle, value] of Object.entries(result)) {
          if (typeof value === "bigint") {
            bigintResult[handle] = value;
          } else if (typeof value === "number") {
            bigintResult[handle] = BigInt(value);
          } else if (typeof value === "string" && /^\d+$/.test(value)) {
            bigintResult[handle] = BigInt(value);
          } else {
            bigintResult[handle] = 0n;
          }
        }

        return bigintResult;
      } catch (e: any) {
        const msg = String(e?.message || "").toLowerCase();
        console.error("❌ decryptMultipleValues: Error", e?.message);

        if (msg.includes("500") || msg.includes("internal server error")) {
          FheUtils.setDecryptCooldown(true);
          // Clear UDSIG cache on 500 error - likely expired or invalid
          this.cachedUdsig = undefined;
          localStorage.removeItem("fhe_udsig");
          setTimeout(() => {
            FheUtils.decryptCooldown = 0;
          }, FheUtils.decryptCooldown);
        }
        throw e;
      }
    })();

    FheUtils.decryptPromise = decryptPromise;
    const result = await decryptPromise;
    FheUtils.decryptPromise = null;
    return result;
  }

  async decryptPendingEth(address: string): Promise<number> {
    try {
      const ct = await (this.contract as any).getEncryptedPendingEthWei(address);
      if (!ct || typeof ct !== "string" || !ct.startsWith("0x")) return 0;
      const wei = await this.decryptEuint64(ct);
      return Number(ethers.formatEther(wei));
    } catch {
      return 0;
    }
  }

  // ✅ Buy spins với FHE và ABI chuẩn
  async buySpins(amount: number, ethValue: string) {
    try {
      const encrypted = await this.createBuySpinsInput(amount);

      const tx = await this.contract.buySpins(encrypted.handles[0], encrypted.inputProof, {
        value: ethers.parseEther(ethValue),
      });

      const receipt = await tx.wait();

      return receipt;
    } catch (error) {
      console.error("❌ Error buying spins:", error);
      throw error;
    }
  }

  // ✅ Spin với FHE và decrypt result - TỐI ƯU
  async spin(): Promise<string> {
    try {
      // TỐI ƯU: Bỏ gas estimation để tăng tốc
      const overrides: any = {
        gasLimit: 1_500_000n,
        maxFeePerGas: ethers.parseUnits("30", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
      };

      // Quay kiểu 2 bước: spinLite → settlePrize (giảm HCU, ổn định hơn)
      const tx = await (this.contract as any).spinLite(overrides);

      // TỐI ƯU: Chỉ dùng receipt parsing để tăng tốc
      const user = await this.signer.getAddress();
      const receipt = await tx.wait();

      // Parse result từ receipt
      const topic = ethers.id(SPIN_OUTCOME_SIG);
      const log = receipt.logs.find((l: any) => l.topics?.[0] === topic);
      if (log) {
        const decoded = this.contract.interface.parseLog(log);
        const slot = Number(decoded?.args?.slot || 0);
        const gmDelta = Number(decoded?.args?.gmDelta || 0);
        return JSON.stringify({ slotIndex: slot, gmDelta });
      }
      return "";
    } catch (error) {
      console.error("❌ Error in FHE spin:", error);
      try {
        const anyErr: any = error as any;
        const r = anyErr?.receipt;
        if (r && r.status === 0 && (!Array.isArray(r.logs) || r.logs.length === 0)) {
          const enriched = new Error("HCU_LIMIT_EXCEEDED: FHE operation budget exceeded. Please wait and retry.");
          (enriched as any).code = "HCU_LIMIT";
          throw enriched;
        }
      } catch {}
      throw error;
    }
  }

  // ✅ Buy spins using GM (10 GM per spin) by calling contract N times
  async buySpinWithGm(spins: number): Promise<void> {
    if (spins <= 0) return;
    const fn = (this.contract as any).buySpinWithGmBatch || (this.contract as any).buySpinWithGm;
    const arg = (this.contract as any).buySpinWithGmBatch ? [spins] : [];
    const tx = await fn.apply(this.contract, [...arg, { gasLimit: 1_200_000 }]);

    await tx.wait();
  }

  // ===== Claim ETH via attestation (strict FHE) =====
  async claimPendingEth(desiredEth?: string): Promise<void> {
    const user = await this.signer.getAddress();
    const pendingCt = await (this.contract as any).getEncryptedPendingEthWei(user);
    if (!pendingCt || typeof pendingCt !== "string" || !pendingCt.startsWith("0x")) {
      throw new Error("No pending ETH ciphertext");
    }
    const pendingWei = await this.decryptEuint64(pendingCt);
    if (pendingWei <= 0n) throw new Error("No pending ETH to claim");

    // Determine claim amount
    let claimWei: bigint = pendingWei;
    if (desiredEth && desiredEth.trim() !== "") {
      const desiredWei = ethers.parseEther(desiredEth.trim());
      if (desiredWei <= 0n) throw new Error("Claim amount must be > 0");
      if (desiredWei > pendingWei) throw new Error("Amount exceeds pending ETH");
      claimWei = desiredWei;
    }

    // KMS Callback: request claim and wait for callback
    const tx = await (this.contract as any).requestClaimETH(claimWei);
    await tx.wait();
  }

  // ✅ Map reward amount to slot result
  static mapRewardToSlot(reward: number): string {
    const slotMapping: Record<number | string, string> = {
      0: "Miss",
      50: "Bronze",
      100: "Silver",
      200: "Gold",
      0.01: "Try Again",
      0.001: "Micro GM",
    };

    return slotMapping[reward] || "Unknown";
  }

  // ✅ Refresh user data với FHE
  async refreshUserData(
    address: string,
  ): Promise<{ spins: number; pendingEth: number; gm: number; lastError?: number; lastErrorAt?: number }> {
    try {
      // Use bundle getter to reduce roundtrips and decrypt in one go when possible
      let spins = 0;
      let gm = 0;
      let pendingEth = 0;
      try {
        const bundle = await (this.contract as any).getEncryptedUserBundle(address);
        const ctSpins = bundle?.spins || bundle?.[0];
        const ctGm = bundle?.gm || bundle?.[1];
        const ctPending = bundle?.pendingEthWei || bundle?.[2];
        const dec = await Promise.all([
          this.decryptEuint64(String(ctSpins || "0x")),
          this.decryptEuint64(String(ctGm || "0x")),
          this.decryptEuint64(String(ctPending || "0x")),
        ]);
        spins = Number(dec[0] || 0);
        gm = Number(dec[1] || 0);
        pendingEth = Number(ethers.formatEther(dec[2] || 0n));
      } catch {
        // Fallback to separate decrypts
        const [s, g, p] = await Promise.all([
          this.decryptUserSpins(address),
          this.decryptUserGm(address),
          this.decryptPendingEth(address),
        ]);
        spins = s;
        gm = g;
        pendingEth = p;
      }

      // Try read last encrypted error (optional)
      let lastError: number | undefined;
      let lastErrorAt: number | undefined;
      try {
        const res = await (this.contract as any).getLastError(address);
        const encCode: string = res?.[0];
        const ts: bigint = res?.[1];
        if (encCode && typeof encCode === "string" && encCode.startsWith("0x")) {
          const code = await this.decryptEuint64(encCode);
          lastError = Number(code);
        }
        if (typeof ts !== "undefined") lastErrorAt = Number(ts?.toString?.() || 0);
      } catch {}

      return { spins, pendingEth, gm, lastError, lastErrorAt } as any;
    } catch (error) {
      throw error;
    }
  }
}

// ✅ Export singleton instance
export let fheUtils: FheUtils | null = null;

export const initializeFheUtils = (sdk: any, provider: ethers.BrowserProvider, signer: ethers.Signer) => {
  try {
    // Initialize singleton without logging
    fheUtils = new FheUtils(sdk, provider, signer);

    return fheUtils;
  } catch (error) {
    throw error;
  }
};

// Keypair management functions
export const exportKeypair = (): string => {
  const pub = localStorage.getItem("fhe:keypair:pub");
  const priv = localStorage.getItem("fhe:keypair:priv");

  if (!pub || !priv) {
    throw new Error("No keypair found to export");
  }

  const keypair = { publicKey: pub, privateKey: priv };
  return JSON.stringify(keypair, null, 2);
};

export const importKeypair = (keypairJson: string): boolean => {
  try {
    const keypair = JSON.parse(keypairJson);

    if (!keypair.publicKey || !keypair.privateKey) {
      throw new Error("Invalid keypair format");
    }

    localStorage.setItem("fhe:keypair:pub", keypair.publicKey);
    localStorage.setItem("fhe:keypair:priv", keypair.privateKey);

    // Clear UDSIG when importing new keypair
    clearUserDecryptAuth();

    return true;
  } catch (error) {
    return false;
  }
};

export const clearUserDecryptAuth = (): void => {
  localStorage.removeItem("fhe:udsig");
  localStorage.removeItem("fhe:udsig:timestamp");
};

export const hasKeypair = (): boolean => {
  const pub = localStorage.getItem("fhe:keypair:pub");
  const priv = localStorage.getItem("fhe:keypair:priv");
  return !!(pub && priv);
};

export const clearKeypair = (): void => {
  localStorage.removeItem("fhe:keypair:pub");
  localStorage.removeItem("fhe:keypair:priv");
  clearUserDecryptAuth();
};
