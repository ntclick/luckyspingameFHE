import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { CONFIG } from "../config";
// Strict FHE mode: disable all API/event fallbacks and persistent cache across reloads
import { fheUtils, FheUtils } from "../utils/fheUtils";

export type UserGameState = {
  spins: number;
  gm: number;
  pendingEth: number; // in ETH
  lastSlot: number | null;
  score: number;
  version: number;
};

const ZERO32 = "0x" + "0".repeat(64);

export default function useUserGameState(account: string | null | undefined, enabled: boolean) {
  const ALWAYS_STRICT = CONFIG.STRICT_FHE_ONLY;
  const udsigRequestedRef = useRef<boolean>(false);
  const relayerCooldownUntilRef = useRef<number>(0);
  const lastDecryptedVersionRef = useRef<number>(0);
  const debounceTimerRef = useRef<any>(null);
  const [data, setData] = useState<UserGameState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const currentVersionRef = useRef<number>(0);
  const lastReloadAtRef = useRef<number>(0);
  const inFlightRef = useRef<Promise<UserGameState | null> | null>(null);
  const usingFallbackRef = useRef<boolean>(false);
  const [usingFallback, setUsingFallback] = useState<boolean>(false);

  // Throttling/TTL controls - TỐI ƯU ĐƠN GIẢN
  const MIN_RELOAD_INTERVAL_MS = 2000; // Giảm xuống 2s để responsive
  const CACHE_TTL_MS = 120_000; // Tăng lên 2 phút để cache lâu hơn

  const keys = useMemo(() => {
    const addr = (account || "").toLowerCase();
    const contract = (CONFIG.FHEVM_CONTRACT_ADDRESS || "").toLowerCase();
    const base = `gmspin:bundle:${contract}:${addr}`;
    return {
      base,
      spins: `${base}:spins`,
      gm: `${base}:gm`,
      pendingEth: `${base}:pendingEth`,
      lastSlot: `${base}:lastSlot`,
      score: `${base}:score`,
      version: `${base}:version`,
      displaySpins: `${base}:display:spins`,
      displayGm: `${base}:display:gm`,
      displayPending: `${base}:display:pendingEth`,
      sessionLoaded: `${base}:sessionLoaded`,
    } as const;
  }, [account]);

  const loadFromCache = useCallback((): UserGameState | null => {
    if (ALWAYS_STRICT) return null;
    try {
      const vStr = localStorage.getItem(keys.version);
      if (!vStr) return null;
      const spins = Number(localStorage.getItem(keys.spins) || 0);
      const gm = Number(localStorage.getItem(keys.gm) || 0);
      const pendingEth = Number(localStorage.getItem(keys.pendingEth) || 0);
      const lastSlotStr = localStorage.getItem(keys.lastSlot);
      const lastSlot = lastSlotStr == null ? null : Number(lastSlotStr);
      const score = Number(localStorage.getItem(keys.score) || 0);
      const version = Number(vStr || 0);
      return { spins, gm, pendingEth, lastSlot, score, version };
    } catch {
      return null;
    }
  }, [keys]);

  const saveToCache = useCallback(
    (bundle: UserGameState) => {
      if (ALWAYS_STRICT) return;
      try {
        localStorage.setItem(keys.spins, String(bundle.spins));
        localStorage.setItem(keys.gm, String(bundle.gm));
        localStorage.setItem(keys.pendingEth, String(bundle.pendingEth));
        if (bundle.lastSlot == null) localStorage.removeItem(keys.lastSlot);
        else localStorage.setItem(keys.lastSlot, String(bundle.lastSlot));
        localStorage.setItem(keys.score, String(bundle.score));
        localStorage.setItem(keys.version, String(bundle.version));
        localStorage.setItem(`${keys.base}:lastRefreshed`, String(Date.now()));
        // Persist display overlay to avoid flicker-to-zero
        localStorage.setItem(keys.displaySpins, String(bundle.spins));
        localStorage.setItem(keys.displayGm, String(bundle.gm));
        localStorage.setItem(keys.displayPending, String(bundle.pendingEth));
      } catch {}
    },
    [keys],
  );

  const decrypt64 = useCallback(async (ct: string): Promise<bigint> => {
    try {
      if (!ct || typeof ct !== "string" || !ct.startsWith("0x") || ct === ZERO32) return 0n;
      if (!fheUtils) return 0n;

      // Check cooldown first - TỐI ƯU: Giảm cooldown
      if (FheUtils.isInCooldown()) {
        return 0n;
      }

      const v = await fheUtils.decryptEuint64(ct);
      return typeof v === "bigint" ? v : BigInt(v || 0);
    } catch (error) {
      console.error("Decrypt64 error:", error);
      return 0n;
    }
  }, []);

  const fetchBundle = useCallback(async (): Promise<UserGameState | null> => {
    if (!enabled || !account || !fheUtils) {
      return null;
    }

    try {
      const c: any = fheUtils.contract;

      // TỐI ƯU: Bỏ debug logs để tăng tốc

      // Load tất cả encrypted data cùng lúc
      const [versionBn, spinsEnc, gmEnc, pendingEnc, scoreEnc] = await Promise.all([
        c?.stateVersion?.(account) || 0n,
        c?.getUserSpins?.(account) || "0x" + "0".repeat(64),
        c?.getUserGmBalance?.(account) || "0x" + "0".repeat(64),
        c?.getEncryptedPendingEthWei?.(account) || "0x" + "0".repeat(64),
        c?.getEncryptedScore?.(account) || "0x" + "0".repeat(64),
      ]);

      const version = Number(versionBn?.toString?.() || 0);

      // TỐI ƯU: Bỏ debug logs để tăng tốc

      // Tối ưu: Decrypt tất cả cùng lúc thay vì từng cái
      const contractAddress = c.target as string;
      const handleContractPairs = [
        { handle: spinsEnc, contractAddress },
        { handle: gmEnc, contractAddress },
        { handle: pendingEnc, contractAddress },
        { handle: scoreEnc, contractAddress },
      ];

      // Thử decrypt batch trước
      let decryptedValues: Record<string, bigint> = {};
      try {
        decryptedValues = await fheUtils.decryptMultipleValues(handleContractPairs);
      } catch {}

      // Fallback: decrypt từng cái nếu batch fail (hoặc giá trị chưa có trong batch)
      const [spinsB, gmB, pendingWeiB, scoreB] = await Promise.all([
        decryptedValues[spinsEnc] ?? fheUtils.decryptEuint64(spinsEnc),
        decryptedValues[gmEnc] ?? fheUtils.decryptEuint64(gmEnc),
        decryptedValues[pendingEnc] ?? fheUtils.decryptEuint64(pendingEnc),
        decryptedValues[scoreEnc] ?? fheUtils.decryptEuint64(scoreEnc),
      ]);

      const result: UserGameState = {
        spins: Number(spinsB || 0n),
        gm: Number(gmB || 0n),
        pendingEth: Number(ethers.formatEther(pendingWeiB || 0n)),
        lastSlot: null,
        score: Number(scoreB || 0n),
        version,
      };

      // TỐI ƯU: Bỏ debug logs để tăng tốc
      return result;
    } catch (e: any) {
      console.error("❌ fetchBundle: Error", e);
      setError(e?.message || String(e));
      return null;
    }
  }, [account, enabled, fheUtils]);

  const reload = useCallback(
    async (bypassThrottle: boolean = false, bypassCache: boolean = false) => {
      if (!enabled || !account) return null;
      const now = Date.now();
      if (!bypassThrottle && now - lastReloadAtRef.current < MIN_RELOAD_INTERVAL_MS) {
        return inFlightRef.current || Promise.resolve(data);
      }
      if (inFlightRef.current) return inFlightRef.current;
      setLoading(true);
      const p = (async () => {
        try {
          // Only decrypt when version changes
          const c = fheUtils?.contract as any;
          const onchainVersionBn = c && typeof c.stateVersion === "function" ? await c.stateVersion(account) : 0n;
          const onchainVersion = Number(onchainVersionBn?.toString?.() || 0);
          if (
            onchainVersion === currentVersionRef.current &&
            data &&
            Date.now() - lastReloadAtRef.current < CACHE_TTL_MS
          ) {
            // Return cached data without background refresh to avoid spam
            return data;
          }

          const bundle = await fetchBundle();
          if (bundle) {
            currentVersionRef.current = bundle.version;
            setData(bundle);
            setUsingFallback(usingFallbackRef.current);
            return bundle;
          }
          return null;
        } finally {
          lastReloadAtRef.current = Date.now();
          inFlightRef.current = null;
          setLoading(false);
        }
      })();
      inFlightRef.current = p;
      return p;
    },
    [enabled, account, data, fetchBundle],
  );

  // Initial load logic: chỉ load 1 lần khi enabled thay đổi
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!enabled || !account) return;

      setLoading(true);
      try {
        // Load cache trước
        const cached = loadFromCache();
        if (cached && !cancelled) {
          setData(cached);
          currentVersionRef.current = cached.version;
        }

        // Load mới từ contract (chỉ 1 lần)
        const bundle = await fetchBundle();
        if (bundle && !cancelled) {
          saveToCache(bundle);
          currentVersionRef.current = bundle.version;
          setData(bundle);
          setUsingFallback(usingFallbackRef.current);
        }
      } catch (e: any) {
        if (!cancelled) {
          console.error("❌ Initial load failed:", e);
          setError(e?.message || String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, account]); // Chỉ chạy khi enabled hoặc account thay đổi

  // Subscribe to UserStateChanged to reload on version bumps
  // RE-ENABLE với debounce để tránh spam nhưng vẫn cập nhật UI
  useEffect(() => {
    const c = fheUtils?.contract as any;
    if (!enabled || !account || !c) return;
    const handler = (user: string, versionBn: any) => {
      try {
        if (user?.toLowerCase?.() !== account.toLowerCase()) return;
        const v = Number(versionBn?.toString?.() || 0);
        if (v !== currentVersionRef.current) {
          // Debounce reload để tránh spam nhưng vẫn cập nhật UI
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }
          debounceTimerRef.current = setTimeout(() => {
            reload(false, true);
          }, 1000); // 1s debounce
        }
      } catch {}
    };
    try {
      c.on("UserStateChanged", handler);
    } catch {}
    return () => {
      try {
        c.off("UserStateChanged", handler);
      } catch {}
    };
  }, [enabled, account, reload]);

  return {
    data,
    loading,
    error,
    version: data?.version || 0,
    reload,
    usingFallback,
  } as const;
}
