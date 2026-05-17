import { useEffect, useRef } from "react";
import { getBackoffMs, shouldPausePolling } from "../utils/apiBackoff";

/**
 * Polls `callback` on an interval; backs off when API is unreachable; pauses when tab is hidden.
 */
export function useAdaptivePolling(callback, intervalMs, deps = []) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    let cancelled = false;
    let timerId = null;

    const tick = async (isRefresh = false) => {
      if (cancelled || document.visibilityState === "hidden") return;
      if (shouldPausePolling()) return;
      await callbackRef.current(isRefresh);
    };

    const scheduleNext = () => {
      if (cancelled) return;
      const delay = shouldPausePolling() ? getBackoffMs() : intervalMs;
      timerId = setTimeout(async () => {
        await tick(true);
        scheduleNext();
      }, delay);
    };

    tick(false);
    scheduleNext();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        tick(true);
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);
}
