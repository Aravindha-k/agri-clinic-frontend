import { useEffect } from "react";
import { AlertTriangle, X, Loader2 } from "lucide-react";
import { createPortal } from "react-dom";

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, loading, variant = "danger" }) {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === "Escape" && !loading) onCancel?.();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onCancel, loading]);

    if (!open) return null;

    const iconClass =
        variant === "danger" ? "enterprise-modal__icon--danger" : "enterprise-modal__icon--primary";
    const confirmBtn =
        variant === "danger" ? "btn btn-danger btn-md" : "btn btn-primary btn-md";

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
        >
            <div className="enterprise-backdrop" onClick={loading ? undefined : onCancel} aria-hidden="true" />
            <div className="enterprise-modal">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="enterprise-close-btn absolute top-4 right-4"
                    aria-label="Close"
                >
                    <X className="w-4 h-4" />
                </button>
                <div className="flex items-start gap-4 pr-6">
                    <div className={`enterprise-modal__icon ${iconClass}`}>
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 id="confirm-dialog-title" className="enterprise-modal__title">
                            {title}
                        </h3>
                        <p className="enterprise-modal__message">{message}</p>
                    </div>
                </div>
                <div className="enterprise-modal__footer">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="btn btn-secondary btn-md"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={confirmBtn}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Confirming…
                            </>
                        ) : (
                            "Confirm"
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
