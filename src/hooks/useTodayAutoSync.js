import { useEffect } from "react";
import { todayIsoDate } from "../utils/employeeRoute";
import { TRACKING_AUTO_SYNC_MS, DAY_MAP_AUTO_SYNC_MS } from "../utils/trackingPoll";

/**
 * Polls `onPoll(true)` when viewing today's date and tab is visible.
 * Use alongside an initial `onPoll(false)` on filter changes.
 */
export default function useTodayAutoSync({
  date,
  enabled,
  onPoll,
  intervalMs = DAY_MAP_AUTO_SYNC_MS ?? TRACKING_AUTO_SYNC_MS,
}) {
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
