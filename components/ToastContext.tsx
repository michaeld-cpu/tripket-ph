"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type Ctx = {
  showToast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<Ctx | null>(null);

let nextId = 1;
const TOAST_LIFETIME = 2400;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Track active dismiss timers so we can reset them if the same toast fires again
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const scheduleDismiss = useCallback((id: number) => {
    const existing = timers.current.get(id);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== id));
      timers.current.delete(id);
    }, TOAST_LIFETIME);
    timers.current.set(id, t);
  }, []);

  const showToast = useCallback((message: string, variant: ToastVariant = "success") => {
    // Replace mode — only ever one toast visible at a time. Each new call replaces
    // whatever is on screen so rapid-fire actions (multiple copies, etc.) never stack.
    const id = nextId++;
    // Clear any pending dismiss timers from the previous toast
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    setToasts([{ id, message, variant }]);
    scheduleDismiss(id);
  }, [scheduleDismiss]);

  // Clean up timers on unmount
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach(clearTimeout);
      map.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastViewport toasts={toasts} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

function ToastViewport({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const variantStyles: Record<ToastVariant, { bg: string; iconBg: string; iconColor: string; path: string }> = {
    success: {
      bg: "bg-brand-600",
      iconBg: "bg-white/20",
      iconColor: "text-white",
      path: "M5 12l5 5 9-11",
    },
    error: {
      bg: "bg-red-600",
      iconBg: "bg-white/20",
      iconColor: "text-white",
      path: "M6 6l12 12M18 6L6 18",
    },
    info: {
      bg: "bg-gray-900",
      iconBg: "bg-white/15",
      iconColor: "text-white",
      path: "M12 8v5M12 16v.5",
    },
  };
  const s = variantStyles[toast.variant];

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all duration-200 ease-out ${s.bg} ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <span className={`grid h-5 w-5 place-items-center rounded-full ${s.iconBg}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`h-3 w-3 ${s.iconColor}`}>
          {toast.variant === "info" && <circle cx="12" cy="12" r="10" />}
          <path d={s.path} />
        </svg>
      </span>
      <span>{toast.message}</span>
    </div>
  );
}
