import { useEffect } from "react";
import { todayIsoDate } from "../utils/employeeRoute";
import { TRACKING_AUTO_SYNC_MS } from "../utils/trackingPoll";

/**
 * Polls `onPoll(true)` every 12s when viewing today's date and tab is visible.
 * Use alongside an initial `onPoll(false)` on filter changes.
 */
export default function useTodayAutoSync({ date, enabled, onPoll, intervalMs = TRACKING_AUTO_SYNC_MS }) {
  const isToday = date === todayIsoDate();

  useEffect(() => {
    if (!enabled || !isToday) return undefined;

    const tick = () => {
      if (document.visibilityState === "hidden") return;
      onPoll(true);
    };

    const timer = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(timer);
  }, [date, enabled, isToday, onPoll, intervalMs]);

  useEffect(() => {
    if (!enabled || !isToday) return undefined;

    const onVisible = () => {
      if (document.visibilityState === "visible") onPoll(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [enabled, isToday, onPoll]);
}
