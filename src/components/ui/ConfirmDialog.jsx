import { useEffect, useRef } from "react";
import { AlertTriangle, X, Loader2 } from "lucide-react";
import { createPortal } from "react-dom";

function getFocusable(root) {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");
}

export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  loading,
  variant = "danger",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
}) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const focusables = getFocusable(panel);
    // Prefer Cancel for destructive confirms to avoid accidental Enter activation.
    const cancelBtn = focusables.find((el) => el.classList.contains("btn-secondary"));
    const confirmBtn = focusables.find(
      (el) => el.classList.contains("btn-danger") || el.classList.contains("btn-primary")
    );
    const preferred =
      variant === "danger" ? cancelBtn || confirmBtn || focusables[0] : confirmBtn || focusables[0];
    preferred?.focus?.();

    const onKey = (e) => {
      if (e.key === "Escape" && !loading) {
        e.preventDefault();
        onCancel?.();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = getFocusable(panel);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      const prev = previouslyFocused.current;
      if (prev && typeof prev.focus === "function") {
        try {
          prev.focus();
        } catch {
          /* ignore */
        }
      }
    };
  }, [open, loading, onCancel, variant]);

  if (!open) return null;

  const iconClass =
    variant === "danger" ? "enterprise-modal__icon--danger" : "enterprise-modal__icon--primary";
  const confirmBtn =
    variant === "danger" ? "btn btn-danger btn-md" : "btn btn-primary btn-md";

  return createPortal(
    <div
      className="confirm-dialog-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
    >
      <div
        className="confirm-dialog-backdrop"
        onClick={loading ? undefined : onCancel}
        aria-hidden="true"
      />
      <div className="confirm-dialog-center">
        <div
          ref={panelRef}
          className="enterprise-modal confirm-dialog-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="enterprise-close-btn absolute top-4 right-4"
            aria-label="Close"
          >
            <X className="w-4 h-4 pointer-events-none" aria-hidden="true" />
          </button>
          <div className="flex items-start gap-4 pr-6">
            <div className={`enterprise-modal__icon ${iconClass}`}>
              <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 id="confirm-dialog-title" className="enterprise-modal__title">
                {title}
              </h3>
              <p id="confirm-dialog-desc" className="enterprise-modal__message">
                {message}
              </p>
            </div>
          </div>
          <div className="enterprise-modal__footer">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="btn btn-secondary btn-md"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={confirmBtn}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin pointer-events-none" aria-hidden="true" />
                  Confirming…
                </>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
