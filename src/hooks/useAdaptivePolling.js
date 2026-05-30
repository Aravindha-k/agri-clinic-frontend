import { useEffect, useRef } from "react";
import { getBackoffMs, shouldPausePolling } from "../utils/apiBackoff";

/**
 * Polls `callback` on an interval; backs off when API is unreachable; pauses when tab is hidden.
 * Callback identity is ignored for scheduling — pass a stable function or rely on callbackRef.
 */
export function useAdaptivePolling(callback, intervalMs = 30_000, userDeps = []) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const inFlightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timerId = null;

    const run = async (isRefresh = false) => {
      if (cancelled || document.visibilityState === "hidden") return;
      if (shouldPausePolling()) return;
      if (inFlightRef.current) {
        if (import.meta.env.DEV) {
          console.debug("[useAdaptivePolling] skipped — load already in flight");
        }
        return;
      }

      inFlightRef.current = true;
      try {
        await callbackRef.current(isRefresh);
      } finally {
        inFlightRef.current = false;
      }
    };

    const scheduleNext = () => {
      if (cancelled) return;
      const delay = shouldPausePolling() ? Math.max(getBackoffMs(), intervalMs) : intervalMs;
      timerId = window.setTimeout(() => {
        run(true).finally(() => {
          if (!cancelled) scheduleNext();
        });
      }, delay);
    };

    run(false).finally(() => {
      if (!cancelled) scheduleNext();
    });

    const onVisible = () => {
      if (document.visibilityState === "visible" && !cancelled) {
        run(true);
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (timerId) window.clearTimeout(timerId);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...userDeps]);
}
