import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const toast = useCallback(
    (message, { tone = "info", duration = 3500 } = {}) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((list) => [...list.slice(-2), { id, message, tone }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex max-w-md animate-pop-in items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur-md [--from-scale:0.9] ${
              t.tone === "error"
                ? "border-red-500/40 bg-red-950/90 text-red-100"
                : t.tone === "success"
                ? "border-emerald-500/30 bg-surface-2/95 text-white"
                : "border-white/10 bg-surface-2/95 text-white"
            }`}
          >
            {t.tone === "success" && <span className="h-2 w-2 shrink-0 rounded-full bg-match" />}
            {t.tone === "error" && <span className="h-2 w-2 shrink-0 rounded-full bg-red-400" />}
            {t.message}
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="ml-1 text-white/50 hover:text-white"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx.toast;
};
