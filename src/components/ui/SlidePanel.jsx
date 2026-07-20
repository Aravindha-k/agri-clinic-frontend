import { useEffect } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

export default function SlidePanel({ open, onClose, title, wide, children, tone }) {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;
    return createPortal(
        <div
            className="fixed inset-0 z-[9997] flex justify-end"
            data-overlay="slide-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="slide-panel-title"
        >
            <div
                className="enterprise-backdrop"
                onClick={onClose}
                aria-hidden="true"
                data-overlay="slide-panel-backdrop"
            />
            <div
                className={`enterprise-drawer ${wide ? "w-full max-w-2xl" : "w-full max-w-lg"}${tone === "masters" ? " masters-admin-drawer" : ""}`}
            >
                <div className="enterprise-drawer__header">
                    <h2 id="slide-panel-title" className="enterprise-drawer__title">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="enterprise-drawer__close"
                        aria-label="Close panel"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="enterprise-drawer__body">{children}</div>
            </div>
        </div>,
        document.body
    );
}
