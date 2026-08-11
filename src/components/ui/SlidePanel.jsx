import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { lockOverlayScroll } from "../../utils/overlayLock";

function getFocusable(root) {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");
}

export default function SlidePanel({ open, onClose, title, wide, children, tone }) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    const unlock = lockOverlayScroll();

    const panel = panelRef.current;
    const focusables = getFocusable(panel);
    const closeBtn = focusables.find((el) => el.getAttribute("aria-label") === "Close panel");
    (closeBtn || focusables[0])?.focus?.();

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
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
      unlock();
      const prev = previouslyFocused.current;
      if (prev && typeof prev.focus === "function") {
        try {
          prev.focus();
        } catch {
          /* ignore */
        }
      }
    };
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
        ref={panelRef}
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
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div className="enterprise-drawer__body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
