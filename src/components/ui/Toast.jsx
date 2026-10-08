import { useEffect, useState, useCallback, createContext, useContext, useRef } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { prefersReducedMotion } from "../../utils/motion";

const ToastContext = createContext(null);

const EXIT_MS = 220;

const ICONS = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};
const COLORS = {
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    error: "bg-red-50 border-red-200 text-red-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    info: "bg-teal-50 border-teal-200 text-teal-900",
};
const ICON_COLORS = {
    success: "text-emerald-600",
    error: "text-red-500",
    warning: "text-amber-500",
    info: "text-teal-600",
};
const ARIA_LIVE = {
    error: "assertive",
    warning: "assertive",
    success: "polite",
    info: "polite",
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const exitTimers = useRef(new Map());

    useEffect(() => {
        const timers = exitTimers.current;
        return () => timers.forEach((t) => clearTimeout(t));
    }, []);

    const removeToast = useCallback((id) => {
        if (prefersReducedMotion()) {
            setToasts((prev) => prev.filter((t) => t.id !== id));
            return;
        }
        setToasts((prev) =>
            prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
        );
        const timer = setTimeout(() => {
            exitTimers.current.delete(id);
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, EXIT_MS);
        exitTimers.current.set(id, timer);
    }, []);

    const addToast = useCallback((message, type = "success", duration = 3500, options = {}) => {
        const toastKey = options?.id ? String(options.id) : null;
        const id = toastKey || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        setToasts((prev) => {
            const next = toastKey ? prev.filter((t) => t.id !== toastKey) : prev;
            return [...next, { id, message, type, duration }];
        });
    }, []);

    return (
        <ToastContext.Provider value={addToast}>
            {children}
            <div
                className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm"
                aria-label="Notifications"
            >
                {toasts.map((t) => (
                    <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function ToastItem({ toast, onDismiss }) {
    useEffect(() => {
        const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
        return () => clearTimeout(timer);
    }, [toast.id, toast.duration, onDismiss]);

    const Icon = ICONS[toast.type] || Info;
    return (
        <div
            role="status"
            aria-live={ARIA_LIVE[toast.type] || "polite"}
            className={`app-toast flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${
                toast.leaving ? "app-toast--exit" : "app-toast--enter"
            } ${COLORS[toast.type]}`}
        >
            <Icon className={`w-5 h-5 flex-shrink-0 ${ICON_COLORS[toast.type]}`} aria-hidden="true" />
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button
                onClick={() => onDismiss(toast.id)}
                className="p-1 rounded hover:bg-black/5"
                aria-label="Dismiss notification"
            >
                <X className="w-3.5 h-3.5 opacity-50" />
            </button>
        </div>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within ToastProvider");
    return ctx;
}
