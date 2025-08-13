import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import "./App.css";
import { SpinWheel } from "./components/SpinWheel";
import { Toast } from "./components/Toast";
import NetworkWarning from "./components/NetworkWarning";
import TypingButton from "./components/TypingButton";
import "./components/NetworkWarning.css";
import "./components/TypingButton.css";
import useToast from "./hooks/useToast";
import { CONFIG, WHEEL_SLOTS, computeSlotMapping } from "./config";
import useFheSdk from "./hooks/useFheSdk";
import useUserGameState from "./hooks/useUserGameState";
import { initializeFheUtils, fheUtils } from "./utils/fheUtils";
import { useNetworkCheck, switchToSepolia } from "./utils/networkUtils";

type TxState = "idle" | "pending" | "success" | "error";

const App: React.FC = () => {
  const { sdk, isReady, setSignerAndProvider } = useFheSdk();

  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState<string>("");
  const [connected, setConnected] = useState(false);

  const [availableSpins, setAvailableSpins] = useState<number>(0);
  // Optional: track decrypted spins from chain (informational)
  // note: removed unused on-chain spins state to keep lints clean
  const [gmBalance, setGmBalance] = useState<number>(0);
  const [ethWalletBalance, setEthWalletBalance] = useState<number>(0);
  const [ethBalance, setEthBalance] = useState<number>(0); // pending ETH (decrypted)
  const [claimAmount, setClaimAmount] = useState<string>("");
  const [publishedScore, setPublishedScore] = useState<number>(0);
  const [lastSlot, setLastSlot] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ address: string; score: number }[]>([]);
  const [canCheckin, setCanCheckin] = useState<boolean>(false);
  const [isCheckinLoading, setIsCheckinLoading] = useState<boolean>(true);
  const [nextResetUtc, setNextResetUtc] = useState<string>("");
  const [checkinCountdown, setCheckinCountdown] = useState<string>("");

  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<string>("Buy spins to start playing!");
  const [spinMessage, setSpinMessage] = useState<string>("Purchase spins with GM Tokens to begin");
  const [showRecentSpin, setShowRecentSpin] = useState<boolean>(false);
  const [txStatus, setTxStatus] = useState<TxState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);
  // Store parsed on-chain spin outcome until wheel animation completes
  const pendingResultRef = useRef<{ slot: number; gmDelta: number } | null>(null);
  // Ensure we only request UDSIG once per session
  const udsigRequestedRef = useRef<boolean>(false);
  // Ensure trial spin is only attempted once per device/account
  const trialGrantedRef = useRef<boolean>(false);

  // Toasts must be declared once (here) before callbacks use push/update/remove
  const { toasts, push, update, remove } = useToast();

  // Network check hook
  const { isCorrectNetwork, currentNetwork, isChecking, checkNetwork } = useNetworkCheck(provider);

  // header tools removed; keep codebase minimal for performance

  // header tools removed

  // header tools removed

  const repairPrivateState = useCallback(async () => {
    try {
      requireReady();

      // Try checkIn() when available (Simple contract)
      try {
        if (typeof (fheUtils as any)?.contract?.checkIn === "function") {
          const tx = await (fheUtils as any).contract.checkIn();
          await tx.wait();
          push("success", "Check-in completed", 2000);
          return;
        }
      } catch (e: any) {}

      // Fallback to buying 1 spin (more expensive but guaranteed to work)
      try {
        const tx = await (fheUtils as any).buySpinWithGm(1);
        await tx.wait();
        push("success", "Bought 1 spin to repair state", 2000);
      } catch (e: any) {
        throw new Error("Both repair methods failed. Please try manual check-in or buy spins.");
      }
    } catch (error) {
      throw error;
    }
  }, [push]);

  const [buyEthAmount, setBuyEthAmount] = useState<string>("0.01");
  const [isBuySpinsOpen, setIsBuySpinsOpen] = useState(false);
  const [spinsAmount, setSpinsAmount] = useState<number>(1);
  const [isBuyingSpins, setIsBuyingSpins] = useState<boolean>(false);
  // Loading flags for on-chain data groups
  const [spinsLoading, setSpinsLoading] = useState<boolean>(true);
  const [gmLoading, setGmLoading] = useState<boolean>(true);
  const [pendingEthLoading, setPendingEthLoading] = useState<boolean>(true);
  const [scoreLoading, setScoreLoading] = useState<boolean>(true);
  // Cache last FHE decrypted spins (informational only)
  const [lastSpinsFhe, setLastSpinsFhe] = useState<number>(0); // eslint-disable-line @typescript-eslint/no-unused-vars
  // Cache helpers removed in unified bundle mode

  // Network warning state
  const [showNetworkWarning, setShowNetworkWarning] = useState<boolean>(false);

  // const pricePerSpinEth = useMemo(() => CONFIG.SPIN.PRICE_PER_SPIN || 0.01, []);
  const maxSpinsAvailable = useMemo(() => Math.floor((gmBalance || 0) / 10), [gmBalance]);

  // Persist optimistic values per user+contract to survive reloads
  // storagePrefix removed in strict on-chain mode

  // Persisted getters removed in strict on-chain mode

  // Persisted setters removed in strict on-chain mode

  const requireReady = useCallback(() => {
    // TỐI ƯU: Chỉ check điều kiện tối thiểu để tăng tốc
    if (!connected || !account) throw new Error("Wallet not connected");
    if (!fheUtils) throw new Error("FHE Utils not initialized");
    if (!isCorrectNetwork) throw new Error("Please switch to Sepolia network");
    // TỐI ƯU: Bỏ sdk/isReady check để tăng tốc response
  }, [connected, account, fheUtils, isCorrectNetwork]);

  // Unified FHE bundle state (load once/session, decrypt all fields together, refresh on stateVersion)
  const {
    data: userData,
    loading: userDataLoading,
    error: userDataError,
    reload: reloadUserState,
    usingFallback,
  } = useUserGameState(account, connected && !!fheUtils);

  // removed duplicate UDSIG request effect to avoid relayer spam

  // Reflect unified data into existing UI states (and loading flags)
  useEffect(() => {
    if (!userDataLoading) {
      setSpinsLoading(false);
      setGmLoading(false);
      setPendingEthLoading(false);
      setScoreLoading(false);
    } else {
      setSpinsLoading(true);
      setGmLoading(true);
      setPendingEthLoading(true);
      setScoreLoading(true);
    }
  }, [userDataLoading]);

  // Detect if contract supports KMS request/callback claim flow
  const hasKmsRequest = useMemo(() => {
    try {
      const c: any = (fheUtils as any)?.contract;
      return typeof c?.requestPendingEthDecryption === "function" || typeof c?.requestClaimDecryption === "function";
    } catch {
      return false;
    }
  }, [fheUtils]);

  useEffect(() => {
    if (!userData) return;
    setAvailableSpins(userData.spins || 0);
    setLastSpinsFhe(userData.spins || 0);
    setGmBalance(userData.gm || 0);
    setEthBalance(userData.pendingEth || 0);
    setLastSlot(userData.lastSlot == null ? null : Number(userData.lastSlot));
    setPublishedScore(userData.score || 0);
  }, [userData]);

  // Tối ưu: Kết nối ví nhanh hơn
  const connectWallet = useCallback(async () => {
    try {
      if (!window.ethereum) {
        push("error", "MetaMask not found. Please install MetaMask.", 4000);
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setProvider(provider);
      setSigner(signer);
      setAccount(address);
      setConnected(true);

      // Tối ưu: Set SDK ngay lập tức để không chờ
      setSignerAndProvider(provider, signer);

      // Tối ưu: Load balance song song với SDK init
      Promise.all([
        provider.getBalance(address).then((balance) => setEthWalletBalance(Number(ethers.formatEther(balance)))),
        // Load user data sau khi SDK ready - TỐI ƯU: Giảm delay
        new Promise((resolve) => {
          const checkSDK = () => {
            if (isReady) {
              reloadUserState(true, true);
              resolve(true);
            } else {
              setTimeout(checkSDK, 50); // Giảm từ 100ms xuống 50ms
            }
          };
          checkSDK();
        }),
      ]).catch((e) => {
        console.error("🟥 connectWallet: post-init error", e);
      });
    } catch (error: any) {
      console.error("Wallet connection error:", error);
      push("error", error?.message || "Failed to connect wallet", 4000);
    }
  }, [push, setSignerAndProvider, isReady, reloadUserState]);

  // Handle network switching
  const handleSwitchNetwork = useCallback(async () => {
    try {
      const success = await switchToSepolia();
      if (success) {
        setShowNetworkWarning(false);
        push("success", "Successfully switched to Sepolia network", 3000);
        // Reload page to refresh all states
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        push("error", "Failed to switch network", 4000);
      }
    } catch (error: any) {
      console.error("Network switch error:", error);
      push("error", error?.message || "Failed to switch network", 4000);
    }
  }, [push]);

  const disconnectWallet = useCallback(() => {
    setConnected(false);
    setProvider(null);
    setSigner(null);
    setAccount("");
    setTxStatus("idle");
    setErrorMessage("");
  }, [account, publishedScore]);

  useEffect(() => {
    if (sdk && isReady && provider && signer) {
      try {
        initializeFheUtils(sdk, provider, signer);
      } catch (e) {
        console.error("❌ App: fheUtils initialization failed", e);
        // Show error to user
        push("error", "Failed to initialize FHE system. Please refresh the page.", 5000);
      }
    }
  }, [sdk, isReady, provider, signer, push]);

  // Request user-decrypt authorization once per session after SDK/utils are ready
  useEffect(() => {
    (async () => {
      try {
        if (!connected || !sdk || !isReady || !fheUtils || udsigRequestedRef.current) return;
        udsigRequestedRef.current = true;

        const ok = await (fheUtils as any).requestUserDecryptAuthorization();
        if (ok) {
          try {
            await (reloadUserState as any)?.(true, true);
          } catch (e) {
            console.error("❌ App: Failed to reload user state after authorization:", e);
          }
        } else {
        }
      } catch (e) {
        console.error("❌ App: User-decrypt authorization error:", e);
      }
    })();
  }, [connected, sdk, isReady, fheUtils, reloadUserState]);

  // Check network and show warning if not on Sepolia
  useEffect(() => {
    if (connected && !isChecking && !isCorrectNetwork) {
      setShowNetworkWarning(true);
    } else if (connected && isCorrectNetwork) {
      setShowNetworkWarning(false);
    }
  }, [connected, isChecking, isCorrectNetwork]);

  // One-time trial spin flagging; will be executed after handleDailyGm is defined
  const tryGrantTrialSpin = useCallback(() => {
    try {
      if (!connected || !account) return;
      if (txStatus === "pending") return;
      const key = `gmspin:trial:${(CONFIG.FHEVM_CONTRACT_ADDRESS || "").toLowerCase()}:${account.toLowerCase()}`;
      if (trialGrantedRef.current) return;
      if (localStorage.getItem(key) === "1") return;
      const spinsNow = Number.isFinite(availableSpins) ? availableSpins : userData?.spins || 0;
      if (!userDataLoading && spinsNow <= 0 && canCheckin) {
        trialGrantedRef.current = true;
        return key;
      }
    } catch {}
    return null as string | null;
  }, [connected, account, txStatus, availableSpins, userData, userDataLoading, canCheckin]);

  // Eager connect: if the site is already authorized in the wallet, load account on first visit without prompting
  useEffect(() => {
    const anyWindow = window as any;
    if (!anyWindow?.ethereum) return;
    let cancelled = false;
    (async () => {
      try {
        const browserProvider = new ethers.BrowserProvider(anyWindow.ethereum);
        const accounts: string[] = await anyWindow.ethereum.request({ method: "eth_accounts" });
        if (cancelled) return;
        if (accounts && accounts.length > 0) {
          const acc = accounts[0];
          const s = await browserProvider.getSigner();
          setProvider(browserProvider);
          setSigner(s);
          setAccount(acc);
          setConnected(true);
          setSignerAndProvider(browserProvider, s);
        }
      } catch (e) {}
    })();
    const onAccounts = (accs: string[]) => {
      if (!accs || accs.length === 0) {
        setConnected(false);
        setAccount("");
        setSigner(null);
        setProvider(null);
        return;
      }
      // reload signer/provider
      (async () => {
        try {
          const browserProvider = new ethers.BrowserProvider(anyWindow.ethereum);
          const s = await browserProvider.getSigner();
          setProvider(browserProvider);
          setSigner(s);
          setAccount(accs[0]);
          setConnected(true);
          setSignerAndProvider(browserProvider, s);
        } catch {}
      })();
    };
    const onChainChanged = () => {
      // force a light refresh to keep provider state consistent
      try {
        window.location.reload();
      } catch {}
    };
    try {
      anyWindow.ethereum.on?.("accountsChanged", onAccounts);
      anyWindow.ethereum.on?.("chainChanged", onChainChanged);
    } catch {}
    return () => {
      cancelled = true;
      try {
        anyWindow.ethereum.removeListener?.("accountsChanged", onAccounts);
        anyWindow.ethereum.removeListener?.("chainChanged", onChainChanged);
      } catch {}
    };
  }, [setSignerAndProvider]);

  useEffect(() => {
    const load = async () => {
      try {
        if (!provider || !account) return;
        const bal = await provider.getBalance(account);
        setEthWalletBalance(Number(ethers.formatEther(bal)));
      } catch {}
    };
    load();
  }, [provider, account]);

  // moved scheduleRefresh earlier to satisfy hook order

  // Subscribe to on-chain CheckInCompleted events (debug/logging)
  useEffect(() => {
    const c = (fheUtils as any)?.contract;
    if (!c || !account) return;
    const handler = (user: string, timestamp: any) => {
      try {
        if (user?.toLowerCase?.() === account.toLowerCase()) {
          const ts = Number(timestamp?.toString?.() || timestamp);

          // no auto refresh during session
        }
      } catch {}
    };
    try {
      c.on("CheckInCompleted", handler);
    } catch {}
    return () => {
      try {
        c.off("CheckInCompleted", handler);
      } catch {}
    };
  }, [account]);

  // Load on-chain check-in state (UTC day) and compute next reset time
  useEffect(() => {
    let cancelled = false;
    const loadCheckin = async () => {
      setIsCheckinLoading(true);
      try {
        if (!connected || !isReady || !fheUtils || !account) {
          if (!cancelled) setCanCheckin(false);
          return;
        }
        if (typeof (fheUtils as any)?.contract?.lastCheckInDay !== "function") return;
        const lastDay: bigint = await (fheUtils as any).contract.lastCheckInDay(account);
        const nowSec = Math.floor(Date.now() / 1000);
        const nowDay = Math.floor(nowSec / (24 * 60 * 60));
        if (!cancelled) setCanCheckin(nowDay > Number(lastDay));
        const nextResetSec = (nowDay + 1) * 24 * 60 * 60; // next 00:00 UTC
        const d = new Date(nextResetSec * 1000).toISOString().replace(".000Z", "Z");
        if (!cancelled) setNextResetUtc(d);
      } catch {
        if (!cancelled) setCanCheckin(false);
      } finally {
        if (!cancelled) setIsCheckinLoading(false);
      }
    };
    loadCheckin();
    return () => {
      cancelled = true;
    };
  }, [connected, account, isReady]);

  // Run countdown whenever nextResetUtc is known and user has already checked in
  useEffect(() => {
    if (!nextResetUtc || canCheckin) {
      setCheckinCountdown("");
      return;
    }
    const nextResetSec = Math.floor(new Date(nextResetUtc).getTime() / 1000);
    const updateCountdown = () => {
      const remain = nextResetSec - Math.floor(Date.now() / 1000);
      if (remain <= 0) {
        setCheckinCountdown("00:00:00");
        return;
      }
      const h = Math.floor(remain / 3600)
        .toString()
        .padStart(2, "0");
      const m = Math.floor((remain % 3600) / 60)
        .toString()
        .padStart(2, "0");
      const s = Math.floor(remain % 60)
        .toString()
        .padStart(2, "0");
      setCheckinCountdown(`${h}:${m}:${s}`);
    };
    updateCountdown();
    const id = setInterval(updateCountdown, 1000);
    return () => clearInterval(id);
  }, [nextResetUtc, canCheckin]);

  const refreshUserData = useCallback(async () => {
    try {
      await reloadUserState();
    } catch (error) {
      console.error("❌ refreshUserData failed:", error);
    }
  }, [reloadUserState]);

  // Xóa auto refresh để tránh load liên tục
  const scheduleRefresh = useCallback(() => {
    // Không làm gì cả
  }, []);

  useEffect(() => {
    if (!connected || !sdk || !isReady || !account) return;

    // Add error handling for the initial load
    const loadData = async () => {
      try {
        await refreshUserData();
      } catch (error) {
        console.error("❌ App: Initial data load failed:", error);
      }
    };

    loadData();
    // Xóa scheduleRefresh() để tránh load liên tục
  }, [connected, sdk, isReady, account, refreshUserData]);

  // Listen ErrorChanged and show friendly message
  useEffect(() => {
    const c = (fheUtils as any)?.contract;
    if (!connected || !c || !account) return;
    const handler = async (user: string) => {
      if (user?.toLowerCase?.() !== account?.toLowerCase?.()) return;
      try {
        const res = await c.getLastError(account);
        const encCode: string = res?.[0];
        const ts: bigint = res?.[1];
        let codeNum = 0;
        if (encCode && typeof encCode === "string" && encCode.startsWith("0x")) {
          const code = await (fheUtils as any).decryptEuint64(encCode);
          codeNum = Number(code);
        }
        const map: Record<number, string> = {
          1: "Not enough GM to buy spin",
          2: "Already checked in today",
          3: "No spins available",
        };
        const when = ts ? new Date(Number(ts) * 1000).toISOString() : "";
        const msg = (map[codeNum] || (codeNum ? `FHE error code: ${codeNum}` : "")) + (when ? ` at ${when}` : "");
        if (msg) setSpinMessage(msg);
        setTimeout(() => {
          try {
            (reloadUserState as any)?.();
          } catch {}
        }, 300);
      } catch {}
    };
    try {
      c.on("ErrorChanged", handler);
    } catch {}
    return () => {
      try {
        c.off("ErrorChanged", handler);
      } catch {}
    };
  }, [connected, account, reloadUserState]);

  // Remove extra event-driven reloads; rely on stateVersion in useUserGameState
  useEffect(() => {
    return () => {};
  }, []);

  // Remove block polling in this mode

  // Load leaderboard (public only) - load ngay khi app khởi động
  const loadLeaderboard = useCallback(async () => {
    try {
      // Prefer existing contract from fheUtils; fallback to read-only provider
      let c: any = (fheUtils as any)?.contract;
      if (!c) {
        const rpc =
          CONFIG.NETWORK.RPC_URL && CONFIG.NETWORK.RPC_URL.trim() !== ""
            ? CONFIG.NETWORK.RPC_URL
            : "https://rpc.sepolia.org";
        const roProvider = new ethers.JsonRpcProvider(rpc);
        const abi = [
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
        ];
        c = new ethers.Contract(CONFIG.FHEVM_CONTRACT_ADDRESS, abi, roProvider);
      }

      const [addrs, scores] = await c.getPublishedRange(0, 20);
      const items = (addrs || []).map((a: string, i: number) => ({ address: a, score: Number(scores?.[i] || 0) }));

      if (account) {
        const ix = items.findIndex(
          (it: { address: string; score: number }) => it.address?.toLowerCase?.() === account.toLowerCase(),
        );
        if (ix >= 0 && Number.isFinite(publishedScore)) {
          items[ix].score = Math.max(items[ix].score || 0, publishedScore || 0);
        }
      }

      items.sort((a: { address: string; score: number }, b: { address: string; score: number }) => b.score - a.score);

      setLeaderboard(items);
    } catch {}
  }, [account, publishedScore]);

  // Load leaderboard ngay khi contract sẵn sàng
  useEffect(() => {
    const loadWhenReady = () => {
      if ((fheUtils as any)?.contract) {
        loadLeaderboard();
      } else {
        // Retry sau 500ms nếu contract chưa sẵn sàng
        setTimeout(loadWhenReady, 500);
      }
    };
    loadWhenReady();
  }, [loadLeaderboard]);

  // Realtime leaderboard: refresh on publish/unpublish events
  useEffect(() => {
    const c = (fheUtils as any)?.contract;
    if (!c) return;

    // Xóa event listeners không tồn tại trong contract
    // const onPublished = (_user: string) => {
    //   try {
    //     loadLeaderboard();
    //   } catch {}
    // };
    // const onUnpublished = (_user: string) => {
    //   try {
    //     loadLeaderboard();
    //   } catch {}
    // };
    // try {
    //   c.on("ScorePublished", onPublished);
    //   c.on("ScoreUnpublished", onUnpublished);
    // } catch {}
    // return () => {
    //   try {
    //     c.off("ScorePublished", onPublished);
    //     c.off("ScoreUnpublished", onUnpublished);
    //   } catch {}
    // };
  }, [loadLeaderboard]);

  const handleBuyGmTokens = useCallback(async () => {
    try {
      // TỐI ƯU: Set pending ngay lập tức khi click
      setTxStatus("pending");

      // TỐI ƯU: Bỏ debug logs và pre-checks để tăng tốc
      requireReady();
      if (!buyEthAmount) throw new Error("Enter ETH amount");
      const rate = CONFIG.GM_TOKEN_RATE || 1000;
      const gmAmount = Math.floor(Number(buyEthAmount) * rate);
      if (!Number.isFinite(gmAmount) || gmAmount <= 0) throw new Error("Amount must be > 0");

      // TỐI ƯU: Hiển thị toast ngay lập tức
      const toastId = push("pending", "💰 Preparing transaction...");

      // TỐI ƯU: Bỏ retry logic, chỉ thử 1 lần
      if (!sdk) throw new Error("SDK not ready");

      // TỐI ƯU: Pre-encrypt để tăng tốc
      update(toastId, "pending", "🔐 Encrypting input...", 1000);

      // TỐI ƯU: Pre-warm SDK để tăng tốc encryption
      let handles: any[], inputProof: any;
      try {
        const builder = (sdk as any).createEncryptedInput(CONFIG.FHEVM_CONTRACT_ADDRESS, account);
        builder.add64(BigInt(gmAmount));
        const result = await builder.encrypt();
        handles = result.handles;
        inputProof = result.inputProof;
        if (!handles?.length || !inputProof) throw new Error("Relayer returned empty proof");
      } catch (encryptError) {
        // TỐI ƯU: Retry encryption nếu fail
        console.warn("⚠️ First encryption attempt failed, retrying...", encryptError);
        const builder = (sdk as any).createEncryptedInput(CONFIG.FHEVM_CONTRACT_ADDRESS, account);
        builder.add64(BigInt(gmAmount));
        const result = await builder.encrypt();
        handles = result.handles;
        inputProof = result.inputProof;
        if (!handles?.length || !inputProof) throw new Error("Relayer returned empty proof");
      }

      // TỐI ƯU: Fixed gas config thay vì fee calculation
      // SỬA: Gửi ETH vào pool qua trường value
      update(toastId, "pending", "📤 Submitting transaction...", 1000);
      const tx = await (fheUtils as any).contract.buyGmTokensFHE(handles[0], inputProof, {
        gasLimit: 900_000,
        maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
        maxFeePerGas: ethers.parseUnits("50", "gwei"),
        value: ethers.parseEther(String(buyEthAmount)),
      });

      await tx.wait();
      setTxStatus("success");
      setSpinMessage("GM Tokens purchased (FHE)");
      update(toastId, "success", "✅ GM Tokens purchased successfully!", 2500);

      // SỬA: Không reload ngay lập tức, để dữ liệu chính xác sau khi có kết quả vòng quay
      // setTimeout(() => {
      //   try {
      //     (reloadUserState as any)?.(true, true);
      //   } catch {}
      // }, 100);
    } catch (e: any) {
      setTxStatus("error");
      setErrorMessage(e?.reason || e?.shortMessage || e?.message || String(e));
    }
  }, [requireReady, buyEthAmount, account, sdk, push, update, reloadUserState]);

  // Removed confirmBuySpins (ETH path not supported)

  const handleDailyGm = useCallback(async () => {
    try {
      // TỐI ƯU: Set pending ngay lập tức khi click
      setTxStatus("pending");

      requireReady();
      const toastId = push("pending", "☀️ Submitting Daily Check-in...");
      // Strict contract: compute eligibility via lastCheckInDay (UTC day bucket)
      let canCheckin = true;
      try {
        if (typeof (fheUtils as any)?.contract?.lastCheckInDay !== "function") return;
        const lastDay: bigint = await (fheUtils as any).contract.lastCheckInDay(account);
        const nowDay = BigInt(Math.floor(Date.now() / 1000 / (24 * 60 * 60)));
        canCheckin = nowDay > lastDay;
      } catch {}
      if (!canCheckin) throw new Error("Already checked in today");
      // Preflight estimateGas; fallback to a generous cap to avoid OOG reverts on FHE ops
      let gasLimit: any = 2_000_000;
      try {
        const est: bigint = await (fheUtils as any).contract.estimateGas.dailyGm();
        const mul = (value: bigint, num: bigint, den: bigint) => (value * num) / den;
        const withBuffer = mul(est, 15n, 10n);
        const cap = 2_500_000n;
        gasLimit = withBuffer > cap ? cap : withBuffer;
      } catch {}

      const fee = await provider!.getFeeData();
      const priority = ((fee.maxPriorityFeePerGas || 2n * 10n ** 9n) * 13n) / 10n; // +30%
      const base = fee.maxFeePerGas || 20n * 10n ** 9n;
      const maxFee = base + priority;

      const tx = await (fheUtils as any).contract.dailyGm({
        gasLimit,
        maxPriorityFeePerGas: priority,
        maxFeePerGas: maxFee,
      });

      const receipt = await tx.wait();

      try {
        const parsed = receipt.logs
          .map((log: any) => {
            try {
              return (fheUtils as any).contract.interface.parseLog(log);
            } catch {
              return null;
            }
          })
          .filter(Boolean);
        const evt = parsed.find((p: any) => p?.name === "CheckInCompleted");
        if (evt) {
          const ts = Number(evt.args?.timestamp?.toString?.() || 0);
        }
      } catch {}
      setTxStatus("success");
      setSpinMessage("Daily GM successful!");
      update(toastId, "success", "Daily check-in successful (+1 spin)", 2500);
      setCanCheckin(false);
      try {
        const nowSec = Math.floor(Date.now() / 1000);
        const nowDay = Math.floor(nowSec / (24 * 60 * 60));
        const nextResetSec = (nowDay + 1) * 24 * 60 * 60;
        const d = new Date(nextResetSec * 1000).toISOString().replace(".000Z", "Z");
        setNextResetUtc(d);
      } catch {}
      // SỬA: Không reload ngay lập tức, để dữ liệu chính xác sau khi có kết quả vòng quay
      // setTimeout(() => {
      //   try {
      //     (reloadUserState as any)?.(true, true);
      //   } catch {}
      // }, 300);
    } catch (e: any) {
      console.error("🟥 handleDailyGm: error", e);
      setTxStatus("error");
      setErrorMessage(e?.reason || e?.shortMessage || e?.message || String(e));
    }
  }, [requireReady, account, push, update, reloadUserState]);

  // Execute trial after handleDailyGm is available
  useEffect(() => {
    const key = tryGrantTrialSpin();
    if (key) {
      (async () => {
        try {
          await handleDailyGm();
          localStorage.setItem(key, "1");
        } catch {
          // ignore
        }
      })();
    }
  }, [tryGrantTrialSpin, handleDailyGm]);

  const handleSpin = useCallback(async () => {
    try {
      // SỬA: Kiểm tra pending state trước khi spin
      if (txStatus === "pending") {
        push("error", "Please wait for current transaction to complete", 3000);
        return;
      }

      // TỐI ƯU: Set pending ngay lập tức khi click
      setTxStatus("pending");

      // TỐI ƯU: Bỏ pre-checks để tăng tốc response
      requireReady();

      // TỐI ƯU: Chỉ check spins cơ bản, bỏ userDataLoading check
      if (!Number.isFinite(availableSpins) || availableSpins <= 0) {
        push("error", "No spins available. Please buy spins with GM.", 3000);
        setSpinsAmount(1);
        setIsBuySpinsOpen(true);
        setTxStatus("idle");
        return;
      }

      // TỐI ƯU: Hiển thị toast ngay lập tức với hiệu ứng loading
      const toastId = push("pending", "🎲 Preparing spin...");

      // SỬA: Gọi spin và giữ pending cho đến khi settlePrize hoàn thành
      update(toastId, "pending", "📤 Submitting spin transaction...", 1000);
      const resultStr = await fheUtils!.spin();

      // Parse on-chain result but delay UI/balance updates until wheel stops
      try {
        const obj = JSON.parse(resultStr || "{}") as any;
        const slot = Number(obj?.slotIndex ?? -1);
        const gmDelta = Number(obj?.gmDelta ?? 0);
        if (Number.isFinite(slot)) pendingResultRef.current = { slot, gmDelta: Number.isFinite(gmDelta) ? gmDelta : 0 };
      } catch {
        pendingResultRef.current = null;
      }

      // Map on-chain result to a slot index
      const mapResultToSlotIndex = (result: string): number | null => {
        try {
          const obj = JSON.parse(result || "{}");
          if (typeof obj?.slotIndex === "number") {
            const contractIdx = obj.slotIndex;
            const mapping = computeSlotMapping(WHEEL_SLOTS);
            const displayIdx = mapping[contractIdx] ?? contractIdx;
            return displayIdx;
          }
        } catch {}
        return null;
      };
      const mappedIndex = mapResultToSlotIndex(resultStr);
      setTargetSlotIndex(mappedIndex);
      setShowRecentSpin(true);
      setIsSpinning(true);

      // Giữ pending cho đến khi settlePrize hoàn thành
      update(toastId, "pending", "🎯 Spin completed! Settling prize...", 2000);
      // để pending cho đến settlePrize
    } catch (e: any) {
      console.error("🟥 handleSpin: error", e);
      const isSdk = /relayer|sdk|user-decrypt|input-proof|udsig|wasm/i.test(String(e?.message || e));
      const msg = isSdk
        ? "Private data service is unavailable. Please reload the page and try again."
        : e?.code === "HCU_LIMIT"
          ? "FHE HCU limit reached. Please wait and try again."
          : e?.shortMessage || e?.message || "Spin failed";
      setErrorMessage(msg);
      push(isSdk ? "error" : "error", msg, 5000);
      setTxStatus("error");
    }
  }, [requireReady, push, update, reloadUserState, userDataLoading, availableSpins]);

  // replaced by inline handler with support for custom amount

  // Unlock flow removed in this mode

  const gmPreview = useMemo(() => {
    const v = Number(buyEthAmount || 0);
    const rate = CONFIG.GM_TOKEN_RATE || 1000;
    return Math.floor(v * rate);
  }, [buyEthAmount]);

  const handleClaimETH = useCallback(async () => {
    try {
      // TỐI ƯU: Set pending ngay lập tức khi click
      setTxStatus("pending");

      requireReady();
      if (!claimAmount || parseFloat(claimAmount) <= 0) {
        push("error", "Please enter a valid amount to claim", 3000);
        setTxStatus("idle");
        return;
      }

      const amountWei = ethers.parseEther(claimAmount);

      // KIỂM TRA: User có đủ pending ETH không
      const userPendingEthWei = await (fheUtils as any).contract.getEncryptedPendingEthWei(account);
      const userPendingEth = await fheUtils!.decryptEuint64(userPendingEthWei);
      const userPendingEthNumber = Number(ethers.formatEther(userPendingEth));

      // Kiểm tra user có pending ETH không
      if (userPendingEthNumber <= 0) {
        push("error", "No pending ETH available to claim", 3000);
        setTxStatus("idle");
        return;
      }

      // Kiểm tra user có đủ pending ETH không
      if (userPendingEthNumber < parseFloat(claimAmount)) {
        push("error", `Insufficient pending ETH. Available: ${userPendingEthNumber.toFixed(4)} ETH`, 3000);
        setTxStatus("idle");
        return;
      }

      // KIỂM TRA: Contract có đủ ETH để trả không
      const contractBalance = await provider!.getBalance((fheUtils as any).contract.target);
      if (contractBalance < amountWei) {
        push("error", `Contract balance insufficient. Available: ${ethers.formatEther(contractBalance)} ETH`, 3000);
        setTxStatus("idle");
        return;
      }

      const toastId = push("pending", "💸 Requesting ETH claim...");

      // Step 1: request claim (sets pending request on-chain)
      const tx = await (fheUtils as any).contract.requestClaimETH(amountWei, {
        gasLimit: 500_000,
        maxFeePerGas: ethers.parseUnits("50", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
      });

      await tx.wait();

      // Step 2: DEV fallback – directly fulfill claim to simulate KMS callback on Sepolia
      // Contract placeholder allows any caller (non-zero) to call onClaimDecrypted
      try {
        const tx2 = await (fheUtils as any).contract.onClaimDecrypted(account, amountWei, {
          gasLimit: 700_000,
          maxFeePerGas: ethers.parseUnits("50", "gwei"),
          maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
        });
        await tx2.wait();
        setTxStatus("success");
        update(toastId, "success", "Claimed successfully", 2500);
        setClaimAmount("");
        try {
          (reloadUserState as any)?.(true, true);
        } catch {}
        return;
      } catch {}

      // If fallback not executed, keep pending notice (KMS path)
      setTxStatus("success");
      update(toastId, "success", `Claim request submitted! Waiting for KMS...`, 3000);
      setClaimAmount("");
    } catch (e: any) {
      setTxStatus("error");
      const msg = e?.reason || e?.shortMessage || e?.message || String(e);
      setErrorMessage(msg);
      push("error", msg, 5000);
    }
  }, [requireReady, claimAmount, account, push, update, reloadUserState]);

  return (
    <div className="container" style={{ padding: 16 }}>
      {(usingFallback || userDataError?.includes("ACL_PERMISSION_DENIED")) && (
        <div
          style={{
            marginBottom: 10,
            padding: 8,
            borderRadius: 8,
            background: userDataError?.includes("ACL_PERMISSION_DENIED")
              ? "rgba(220,53,69,0.15)"
              : "rgba(255,165,0,0.15)",
            color: userDataError?.includes("ACL_PERMISSION_DENIED") ? "#f8d7da" : "#ffcc80",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span>
            {userDataError?.includes("ACL_PERMISSION_DENIED")
              ? "Access denied - You need to perform daily check-in or buy spins to access private data"
              : "Private data temporarily unavailable (relayer 500 error or ACL issue)."}
            <br />
            <small>
              {userDataError?.includes("ACL_PERMISSION_DENIED")
                ? "Try: 1) Check ACL → 2) Daily check-in → 3) Buy spins"
                : "Try: 1) Check ACL → 2) Clear decrypt auth → 3) Wait 15 seconds → 4) Retry private data"}
            </small>
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <TypingButton
              className="btn btn-secondary"
              onClick={() => reloadUserState(false, true)}
              disabled={userDataLoading || txStatus === "pending"}
              typingSpeed={25}
            >
              {userDataLoading || txStatus === "pending" ? "⏳ Loading..." : "🔄 Retry private data"}
            </TypingButton>
          </div>
        </div>
      )}
      <div className="header">
        <h1>🎰 Lucky Spin FHEVM Demo</h1>
        <p>Secure, verifiable spinning wheel with confidential rewards</p>
        <p className="powered-by">Powered by Zama FHEVM</p>
        <p style={{ marginTop: 8, opacity: 0.85 }}>
          Author:{" "}
          <a href="https://x.com/trungkts29" target="_blank" rel="noreferrer">
            @trungkts29
          </a>
        </p>
      </div>

      <div className="sidebar">
        <div className="card">
          <h3>💰 Buy GM Tokens</h3>
          <div className="status-item">
            <span>Exchange Rate:</span>
            <span className="status-value">1 ETH = {CONFIG.GM_TOKEN_RATE} GM</span>
          </div>
          <div className="status-item">
            <span>Your ETH:</span>
            <span className="status-value">{ethWalletBalance.toFixed(4)}</span>
          </div>
          <div style={{ margin: "15px 0" }}>
            <label style={{ display: "block", marginBottom: 10, fontWeight: 600 }}>Amount to buy:</label>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="number"
                placeholder="0.01"
                min={0.001}
                step={0.001}
                value={buyEthAmount}
                onChange={(e) => setBuyEthAmount(e.target.value)}
                style={{
                  flex: 1,
                  padding: 10,
                  border: "none",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                }}
              />
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.9rem" }}>ETH</span>
            </div>
            <div style={{ marginTop: 5, fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
              = {isNaN(gmPreview) ? 0 : gmPreview} GM Tokens
            </div>
          </div>
          <TypingButton
            className="btn btn-primary"
            onClick={handleBuyGmTokens}
            disabled={!connected || !isReady || !isCorrectNetwork || txStatus === "pending"}
            typingSpeed={25}
          >
            {txStatus === "pending" ? "⏳ Processing..." : "💰 Buy GM Tokens"}
          </TypingButton>
        </div>

        <div className="card">
          <h3>💳 Wallet Connection</h3>
          <div className="status-item">
            <span className={`btn ${connected ? "connected" : "disconnected"}`}>
              {connected ? "✅ Connected" : "❌ Not Connected"}
            </span>
          </div>
          {connected && (
            <>
              <div className="player-address" style={{ wordBreak: "break-all", margin: "10px 0" }}>
                {account}
              </div>
              <div className="status-item" style={{ marginTop: "8px" }}>
                <span className={`btn ${isCorrectNetwork ? "connected" : "disconnected"}`}>
                  {isChecking ? "⏳ Checking..." : isCorrectNetwork ? "✅ Sepolia Network" : "❌ Wrong Network"}
                </span>
              </div>
            </>
          )}
          {!connected ? (
            <TypingButton 
              className="btn btn-primary" 
              onClick={connectWallet} 
              disabled={txStatus === "pending"}
              typingSpeed={30}
            >
              {txStatus === "pending" ? "⏳ Connecting..." : "🔗 Connect Wallet"}
            </TypingButton>
          ) : (
            <TypingButton 
              className="btn btn-danger" 
              onClick={disconnectWallet} 
              disabled={txStatus === "pending"}
              typingSpeed={30}
            >
              {txStatus === "pending" ? "⏳ Disconnecting..." : "❌ Disconnect"}
            </TypingButton>
          )}
        </div>

        <div className="card">
          <h3>🎁 Daily Check-in</h3>
          {isCheckinLoading ? (
            <button className="btn btn-secondary" disabled title="Loading status...">
              ⏳ Loading...
            </button>
          ) : canCheckin ? (
            <TypingButton
              className="btn btn-primary"
              onClick={handleDailyGm}
              disabled={!connected || !isReady || !isCorrectNetwork || txStatus === "pending"}
              title="Check-in to receive +1 spin"
              typingSpeed={20}
            >
              {txStatus === "pending" ? "⏳ Processing..." : "☀️ Daily Check-in (+1 Spin)"}
            </TypingButton>
          ) : (
            <div>
              <button className="btn btn-secondary" disabled title={`Next reset: ${nextResetUtc}`}>
                ✅ Checked in (resets 00:00 UTC)
              </button>
              <div style={{ marginTop: 4, fontSize: "0.8rem", opacity: 0.7 }}>
                Next reset: {nextResetUtc}
                {checkinCountdown ? <span className="countdown">{checkinCountdown}</span> : ""}
              </div>
              <button
                className="btn btn-secondary"
                style={{ marginTop: 8 }}
                onClick={async () => {
                  try {
                    // TỐI ƯU: Set pending ngay lập tức khi click
                    setTxStatus("pending");

                    requireReady();
                    const res = await (fheUtils as any).contract.getLastError(account);
                    const encCode: string = res?.[0];
                    const ts: bigint = res?.[1];
                    let msg = "";
                    if (encCode && typeof encCode === "string" && encCode.startsWith("0x")) {
                      const code = Number(await (fheUtils as any).decryptEuint64(encCode));
                      const map: Record<number, string> = {
                        1: "Not enough GM to buy spin",
                        2: "Already checked in today",
                        3: "No spins available",
                      };
                      msg = map[code] || `FHE error code: ${code}`;
                    }
                    const when = ts ? new Date(Number(ts) * 1000).toISOString() : "";
                    setSpinMessage(msg ? `${msg}${when ? ` at ${when}` : ""}` : "");
                  } catch {}
                }}
              >
                {txStatus === "pending" ? "⏳ Loading..." : "ℹ️ View last error"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="main-content">
        <div className="spin-wheel-container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value" style={{ color: "#2196F3" }}>
                {spinsLoading ? <span style={{ animation: "pulse 1.5s infinite" }}>...</span> : availableSpins}
              </div>
              <div className="stat-label">Available Spins</div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: "#ffd700" }}>
                {gmLoading ? <span style={{ animation: "pulse 1.5s infinite" }}>...</span> : gmBalance}
              </div>
              <div className="stat-label">GM Tokens</div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: "#4CAF50" }}>
                {scoreLoading ? <span style={{ animation: "pulse 1.5s infinite" }}>...</span> : publishedScore}
              </div>
              <div className="stat-label">Total Score</div>
            </div>
          </div>

          {/* Nút refresh nhỏ */}
          <div className="refresh-container">
            <button
              className="refresh-button"
              title="Refresh data"
              aria-label="Refresh user data"
              onClick={() => {
                if (!userDataLoading) {
                  reloadUserState(true, true);
                }
              }}
              disabled={userDataLoading || txStatus === "pending"}
            >
              {userDataLoading ? <span style={{ animation: "spin 1s linear infinite" }}>⏳</span> : "⟳"}
            </button>
            <span className={`refresh-text ${userDataLoading ? "loading" : ""}`}>
              {userDataLoading ? "Loading..." : "Tap to refresh"}
            </span>
          </div>

          {/* Sync buttons removed for privacy-clean UI */}

          <SpinWheel
            isSpinning={isSpinning}
            onSpinComplete={(result) => {
              // Called after wheel animation stops
              let wheelSlot: number | null = null;
              try {
                const obj = JSON.parse(result || "{}") as any;
                wheelSlot = Number(obj?.slotIndex ?? -1);
                if (!Number.isFinite(wheelSlot)) wheelSlot = null;
              } catch {}

              // Prefer on-chain event result captured earlier
              const chain = pendingResultRef.current;
              // If no chain slot, map display index back to contract slot
              let mappedContractFromWheel: number | null = null;
              if (wheelSlot != null) {
                const map = computeSlotMapping(WHEEL_SLOTS); // contract -> display
                const inv: number[] = [];
                map.forEach((dispIdx, contractIdx) => {
                  inv[dispIdx] = contractIdx;
                });
                mappedContractFromWheel = Number.isFinite(inv[wheelSlot]) ? inv[wheelSlot] : null;
              }
              const finalSlot = Number.isFinite(chain?.slot) ? chain!.slot : (mappedContractFromWheel ?? -1);
              // const gmDelta = Number.isFinite(chain?.gmDelta) ? chain!.gmDelta : 0;

              // Human text
              let friendly = "Completed";
              if (finalSlot === 0) friendly = "Won 0.1 ETH (pending)";
              else if (finalSlot === 1) friendly = "Won 0.01 ETH (pending)";
              else if (finalSlot >= 2 && finalSlot <= 4) friendly = "Miss";
              else if (finalSlot === 5) friendly = "Won 5 GM";
              else if (finalSlot === 6) friendly = "Won 15 GM";
              else if (finalSlot === 7) friendly = "Won 30 GM";
              setSpinResult(friendly);
              setSpinMessage("Spin complete");

              // Strict mode: do not optimistically mutate balances; rely on reload
              setLastSlot(Number.isFinite(finalSlot) ? finalSlot : lastSlot);

              // Reset spinning flags to enable next spin
              setIsSpinning(false);
              setTargetSlotIndex(null);
              // Preserve finalSlot for settlement, then clear pending ref
              const slotForSettlement = Number.isFinite(finalSlot) ? (finalSlot as number) : -1;
              pendingResultRef.current = null;

              // Two-step flow: call settlePrize to apply ETH/GM, then reload
              (async () => {
                try {
                  if (slotForSettlement >= 0 && slotForSettlement <= 7) {
                    // If ETH prize, ensure pool has enough
                    if (slotForSettlement === 0 || slotForSettlement === 1) {
                      const contractBalance = await provider!.getBalance((fheUtils as any).contract.target);
                      const required = slotForSettlement === 0 ? ethers.parseEther("0.1") : ethers.parseEther("0.01");
                      if (contractBalance < required) {
                        setTxStatus("error");
                        setErrorMessage(`Contract balance insufficient: need ${ethers.formatEther(required)} ETH`);
                        return;
                      }
                    }

                    const fee = await provider!.getFeeData();
                    const pr = ((fee.maxPriorityFeePerGas || 2n * 10n ** 9n) * 13n) / 10n;
                    const mf = (fee.maxFeePerGas || 20n * 10n ** 9n) + pr;
                    const tx2 = await (fheUtils as any).contract.settlePrize(slotForSettlement, {
                      gasLimit: 800_000,
                      maxPriorityFeePerGas: pr,
                      maxFeePerGas: mf,
                    });
                    await tx2.wait();
                  }
                  setTxStatus("success");
                  // SỬA: Đảm bảo reload user data sau khi settlePrize thành công

                  await reloadUserState(true, true);
                } catch (err) {
                  console.error("❌ settlePrize failed:", err);
                  setTxStatus("error");
                  setErrorMessage("Prize settlement failed");
                }
              })();
              // Reload leaderboard sau khi user data đã được cập nhật
              setTimeout(() => {
                try {
                  loadLeaderboard();
                } catch {}
              }, 1000);
            }}
            onSpin={handleSpin}
            slots={WHEEL_SLOTS}
            canSpin={
              connected &&
              isReady &&
              txStatus !== "pending" &&
              !userDataLoading &&
              (availableSpins || 0) > 0 &&
              !isSpinning
            }
            targetSlotIndex={targetSlotIndex}
            onBlockedSpin={() => {
              // SỬA: Kiểm tra các trường hợp khác nhau để hiển thị thông báo phù hợp
              if (txStatus === "pending") {
                push("error", "Please wait for current transaction to complete", 3000);
                return;
              }
              if (!Number.isFinite(availableSpins) || availableSpins <= 0) {
                push("error", "No spins available. Please buy spins with GM.", 3000);
                setSpinsAmount(1);
                setIsBuySpinsOpen(true);
                setTxStatus("idle");
                return;
              }
              if (isSpinning) {
                push("error", "Wheel is currently spinning, please wait", 3000);
                return;
              }
              if (!connected) {
                push("error", "Please connect your wallet first", 3000);
                return;
              }
              if (!isReady) {
                push("error", "System is initializing, please wait", 3000);
                return;
              }
              push("error", "Cannot spin at this time", 3000);
            }}
          />

          <div className="spin-section">
            <h4>🎮 SPIN WHEEL</h4>
            <TypingButton
              className="btn btn-primary"
              onClick={() => {
                setSpinsAmount(1);
                setIsBuySpinsOpen(true);
                setTxStatus("idle");
              }}
              disabled={!connected || !isCorrectNetwork || isBuyingSpins || txStatus === "pending"}
              typingSpeed={20}
            >
              {txStatus === "pending" ? "⏳ Processing..." : "🔥 Buy Spins (GM)"}
            </TypingButton>
          </div>

          {showRecentSpin && (
            <div className="result-display show">
              <div className="result-title">🎰 Spin Result</div>
              <div className="result-prize">{spinResult}</div>
              <div className="result-message">{spinMessage}</div>
              {txStatus === "error" && <div style={{ color: "#f88" }}>{errorMessage}</div>}
            </div>
          )}
          {/* Removed Last slot display for cleaner UI */}
        </div>
      </div>

      <div className="sidebar">
        <div className="card">
          <h3>🔐 Your Balance</h3>
          <div className="balance-item">
            <span>GMToken Balance:</span>
            <span className="balance-value gm">{gmBalance}</span>
          </div>
          <div className="balance-item">
            <span>Pending ETH:</span>
            <span className="balance-value eth">{pendingEthLoading ? "…" : ethBalance.toFixed(6)}</span>
          </div>
          <div className="balance-item" style={{ gap: 8, alignItems: "center", marginTop: 8 }}>
            <input
              type="number"
              placeholder="Amount to claim"
              min={0}
              step={0.000001}
              value={claimAmount}
              onChange={(e) => setClaimAmount(e.target.value)}
              style={{
                flex: 1,
                padding: 8,
                borderRadius: 6,
                border: "none",
                background: "rgba(255,255,255,0.1)",
                color: "white",
              }}
            />
            <button
              className="btn btn-secondary"
              onClick={() => setClaimAmount(ethBalance > 0 ? String(ethBalance) : "")}
              disabled={ethBalance <= 0 || txStatus === "pending"}
            >
              MAX
            </button>
          </div>
          <TypingButton
            className="btn btn-primary"
            onClick={handleClaimETH}
            title="Claim ETH with KMS callback"
            disabled={!connected || !isReady || !isCorrectNetwork || txStatus === "pending" || ethBalance <= 0}
            typingSpeed={25}
          >
            {txStatus === "pending" ? "⏳ Claiming..." : "🔐 Claim ETH (KMS)"}
          </TypingButton>
          {/* Unlock button removed */}
        </div>

        <div className="card">
          <h3 style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>🏆 Leaderboard</span>
            <div style={{ display: "flex", gap: 8 }}>
              <TypingButton
                className="btn btn-secondary"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                }}
                title="Refresh"
                aria-label="Refresh leaderboard"
                onClick={loadLeaderboard}
                disabled={txStatus === "pending"}
                typingSpeed={15}
              >
                {txStatus === "pending" ? "⏳" : "🔄"}
              </TypingButton>
                              <TypingButton
                  className="btn btn-secondary"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    padding: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                  }}
                  title="Publish score"
                  aria-label="Publish score"
                  onClick={async () => {
                    try {
                      // TỐI ƯU: Set pending ngay lập tức khi click
                      setTxStatus("pending");

                      requireReady();
                      const score = publishedScore || 0;
                      const toastId = push("pending", "📢 Publishing score...");
                      const tx = await (fheUtils as any).contract.publishScore(score);
                      await tx.wait();
                      update(toastId, "success", "Published to leaderboard", 2500);
                      loadLeaderboard();
                    } catch (e) {
                      push("error", "Publish failed", 3000);
                    }
                  }}
                  disabled={!connected || !isCorrectNetwork || txStatus === "pending"}
                  typingSpeed={15}
                >
                  {txStatus === "pending" ? "⏳" : "📢"}
                </TypingButton>
                              <TypingButton
                  className="btn btn-danger"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    padding: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                  }}
                  title="Unpublish score"
                  aria-label="Unpublish score"
                  onClick={async () => {
                    try {
                      // TỐI ƯU: Set pending ngay lập tức khi click
                      setTxStatus("pending");

                      requireReady();
                      const toastId = push("pending", "🙈 Unpublishing score...");
                      const tx = await (fheUtils as any).contract.unpublishScore();
                      await tx.wait();
                      update(toastId, "success", "Unpublished", 2000);
                      loadLeaderboard();
                    } catch (e) {
                      push("error", "Unpublish failed", 3000);
                    }
                  }}
                  disabled={!connected || !isCorrectNetwork || txStatus === "pending"}
                  typingSpeed={15}
                >
                  {txStatus === "pending" ? "⏳" : "🙈"}
                </TypingButton>
            </div>
          </h3>

          <div style={{ maxHeight: 300, overflowY: "auto", borderRadius: 8, background: "rgba(255,255,255,0.06)" }}>
            {leaderboard.length === 0 ? (
              <div style={{ padding: 12, opacity: 0.7 }}>No public scores</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ position: "sticky", top: 0, background: "rgba(0,0,0,0.25)" }}>
                    <th style={{ textAlign: "center", width: 56, padding: "10px 12px", fontWeight: 600 }}>Rank</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 600 }}>Player</th>
                    <th style={{ textAlign: "right", padding: "10px 12px", fontWeight: 600 }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((item, idx) => {
                    const isMe = item.address?.toLowerCase?.() === account?.toLowerCase?.();
                    const rank = idx + 1;
                    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
                    const rowBg = isMe ? "rgba(76,175,80,0.15)" : rank <= 3 ? "rgba(255,215,0,0.10)" : "transparent";
                    // Leaderboard only contains published entries → show short address
                    const display = `${item.address.slice(0, 6)}…${item.address.slice(-4)}`;
                    const badgeStyle: React.CSSProperties = {
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      fontWeight: 700,
                      background: medal ? "transparent" : "rgba(255,255,255,0.1)",
                    };
                    return (
                      <tr key={item.address + idx} style={{ background: rowBg }}>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          {medal ? (
                            <span style={{ fontSize: 18 }}>{medal}</span>
                          ) : (
                            <span style={badgeStyle}>{rank}</span>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px", fontFamily: "monospace" }} title={item.address}>
                          {isMe ? "You" : display}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>{item.score}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {isBuySpinsOpen && (
        <div
          className="modal"
          onClick={(e) => {
            if (!isBuyingSpins && e.currentTarget === e.target) setIsBuySpinsOpen(false);
          }}
        >
          <div className="modal-content">
            <span
              className="close-btn"
              onClick={() => {
                if (!isBuyingSpins) setIsBuySpinsOpen(false);
              }}
            >
              &times;
            </span>
            <h3>🔥 Buy Spins (use GM)</h3>
            <div className="input-group">
              <label>Number of Spins:</label>
              <div className="input-row">
                <input
                  type="number"
                  placeholder="1"
                  min={1}
                  step={1}
                  value={spinsAmount}
                  onChange={(e) => setSpinsAmount(Math.max(1, Number(e.target.value)))}
                />
                <button className="btn-max" onClick={() => setSpinsAmount(Math.max(1, maxSpinsAvailable))}>
                  MAX
                </button>
              </div>
              <div className="info-text">Cost: {spinsAmount * 10} GM</div>
            </div>
            <div className="modal-buttons">
              <TypingButton
                className="btn btn-secondary"
                onClick={() => setIsBuySpinsOpen(false)}
                disabled={isBuyingSpins || txStatus === "pending"}
                typingSpeed={20}
              >
                Cancel
              </TypingButton>
              <TypingButton
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    requireReady();
                    const requiredGm = spinsAmount * 10;
                    if ((gmBalance || 0) < requiredGm) {
                      throw new Error(`Not enough GM (need ${requiredGm})`);
                    }
                    if (!spinsAmount || spinsAmount < 1) throw new Error("Invalid spins amount");
                    const toastId = push("pending", "Buying spins with GM...");
                    setIsBuyingSpins(true);
                    setTxStatus("pending");
                    await fheUtils!.buySpinWithGm(spinsAmount);
                    setTxStatus("success");
                    setSpinMessage(`Bought ${spinsAmount} spin(s) with GM`);
                    update(toastId, "success", `Bought ${spinsAmount} spin(s)`, 2000);
                    setIsBuySpinsOpen(false);
                    // Strict: do not update local balances; reload from on-chain only
                    setTimeout(
                      () => {
                        try {
                          (reloadUserState as any)?.(true, true);
                        } catch {}
                      },
                      (CONFIG as any).DEMO?.FHE_WAIT_MS ? Number((CONFIG as any).DEMO?.FHE_WAIT_MS) : 300,
                    );
                  } catch (e: any) {
                    setTxStatus("error");
                    setErrorMessage(e?.message || String(e));
                    push("error", e?.shortMessage || e?.message || "Buy spins failed", 4000);
                  } finally {
                    setIsBuyingSpins(false);
                  }
                }}
                disabled={!connected || !isReady || !isCorrectNetwork || txStatus === "pending" || isBuyingSpins}
                typingSpeed={20}
              >
                {isBuyingSpins || txStatus === "pending" ? "Pending..." : "🔥 Buy Spins"}
              </TypingButton>
            </div>
          </div>
        </div>
      )}

      {/* Network Warning Modal */}
      {showNetworkWarning && (
        <NetworkWarning
          currentNetwork={currentNetwork}
          onSwitchNetwork={handleSwitchNetwork}
          onClose={() => setShowNetworkWarning(false)}
        />
      )}

      <Toast toasts={toasts} onRemove={remove} />
    </div>
  );
};

export default App;
