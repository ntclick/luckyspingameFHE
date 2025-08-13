import React from "react";

export type ToastType = "pending" | "success" | "error" | "info";
export type ToastItem = {
  id: number;
  type: ToastType;
  message: string;
};

export const Toast: React.FC<{ toasts: ToastItem[]; onRemove: (id: number) => void }> = ({ toasts, onRemove }) => {
  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const bg =
          t.type === "success"
            ? "rgba(76,175,80,0.95)"
            : t.type === "error"
            ? "rgba(244,67,54,0.95)"
            : t.type === "pending"
            ? "rgba(33,150,243,0.95)"
            : "rgba(97,97,97,0.95)";
        const icon = t.type === "success" ? "✅" : t.type === "error" ? "❌" : t.type === "pending" ? "⏳" : "ℹ️";
        return (
          <div
            key={t.id}
            style={{
              background: bg,
              color: "#fff",
              borderRadius: 8,
              padding: "10px 12px",
              minWidth: 260,
              maxWidth: 340,
              boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ fontWeight: 600 }}>{t.message}</span>
            </div>
            <button
              onClick={() => onRemove(t.id)}
              style={{
                background: "transparent",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontSize: 18,
              }}
              aria-label="Close"
              title="Close"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
};


