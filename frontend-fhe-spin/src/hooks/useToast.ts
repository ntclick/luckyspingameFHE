import { useCallback, useRef, useState } from "react";
import type { ToastItem, ToastType } from "../components/Toast";

export default function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(1);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type: ToastType, message: string, autoCloseMs?: number) => {
    const id = idRef.current++;
    setToasts((prev) => [...prev, { id, type, message }]);
    if (autoCloseMs && autoCloseMs > 0) {
      setTimeout(() => remove(id), autoCloseMs);
    }
    return id;
  }, [remove]);

  const update = useCallback((id: number, type: ToastType, message: string, autoCloseMs?: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, type, message } : t)));
    if (autoCloseMs && autoCloseMs > 0) {
      setTimeout(() => remove(id), autoCloseMs);
    }
  }, [remove]);

  return { toasts, push, update, remove } as const;
}


