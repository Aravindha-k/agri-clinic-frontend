import { useEffect } from "react";

let lockCount = 0;
let prevBodyOverflow = "";
let prevMainOverflow = "";

function getShellScroller() {
  return document.querySelector("main.app-shell__content");
}

export function lockOverlayScroll() {
  const main = getShellScroller();
  if (lockCount === 0) {
    prevBodyOverflow = document.body.style.overflow;
    prevMainOverflow = main?.style.overflow ?? "";
    document.body.style.overflow = "hidden";
    if (main) main.style.overflow = "hidden";
  }
  lockCount += 1;
  return unlockOverlayScroll;
}

export function unlockOverlayScroll() {
  if (lockCount <= 0) {
    lockCount = 0;
    return;
  }
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = prevBodyOverflow;
    const main = getShellScroller();
    if (main) main.style.overflow = prevMainOverflow;
  }
}

export function getOverlayFocusable(root) {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");
}

/**
 * Lock page scroll (body + app shell scroller) while an overlay is open.
 * Optionally traps Tab focus and closes on Escape.
 */
export function useOverlayLock({
  open,
  onClose,
  panelRef,
  closeOnEscape = true,
  trapFocus = true,
  restoreFocus = true,
  initialFocus,
} = {}) {
  useEffect(() => {
    if (!open) return undefined;

    const unlock = lockOverlayScroll();
    const previouslyFocused = document.activeElement;
    const panel = panelRef?.current ?? null;
    const focusables = getOverlayFocusable(panel);
    const preferred =
      typeof initialFocus === "function" ? initialFocus(focusables) : focusables[0];
    preferred?.focus?.();

    const onKey = (event) => {
      if (event.key === "Escape" && closeOnEscape) {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (!trapFocus || event.key !== "Tab" || !panel) return;
      const items = getOverlayFocusable(panel);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      unlock();
      if (!restoreFocus) return;
      const prev = previouslyFocused;
      if (prev && typeof prev.focus === "function") {
        try {
          prev.focus();
        } catch {
          /* ignore */
        }
      }
    };
  }, [open, onClose, panelRef, closeOnEscape, trapFocus, restoreFocus, initialFocus]);
}
