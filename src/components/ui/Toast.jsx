import { useEffect, useState, useCallback, createContext, useContext } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

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
    info: "bg-blue-50 border-blue-200 text-blue-800",
};
const ICON_COLORS = {
    success: "text-emerald-500",
    error: "text-red-500",
    warning: "text-amber-500",
    info: "text-blue-500",
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = "success", duration = 3500) => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, message, type, duration }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={addToast}>
            {children}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
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
    }, [toast, onDismiss]);

    const Icon = ICONS[toast.type] || Info;
    return (
        <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-[slideIn_0.3s_ease] ${COLORS[toast.type]}`}
            style={{ animationFillMode: "forwards" }}
        >
            <Icon className={`w-5 h-5 flex-shrink-0 ${ICON_COLORS[toast.type]}`} />
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button onClick={() => onDismiss(toast.id)} className="p-1 rounded hover:bg-black/5">
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
