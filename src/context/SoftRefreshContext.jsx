import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const SoftRefreshContext = createContext(null);

const MIN_SPIN_MS = 280;
const MAX_SPIN_MS = 3500;
const QUIET_MS = 140;

/**
 * Remounts page outlet content without a full browser reload.
 * Busy state clears when page content settles (or on max timeout).
 */
export function SoftRefreshProvider({ children }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startedAtRef = useRef(0);
  const maxTimerRef = useRef(null);
  const settleTimerRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (maxTimerRef.current) {
      window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    if (settleTimerRef.current) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  const endSoftRefresh = useCallback(() => {
    clearTimers();
    const elapsed = Date.now() - (startedAtRef.current || Date.now());
    const wait = Math.max(0, MIN_SPIN_MS - elapsed);
    if (wait === 0) {
      setRefreshing(false);
      return;
    }
    settleTimerRef.current = window.setTimeout(() => {
      settleTimerRef.current = null;
      setRefreshing(false);
    }, wait);
  }, [clearTimers]);

  const softRefresh = useCallback(() => {
    clearTimers();
    startedAtRef.current = Date.now();
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    // Safety: never spin forever on hung requests / missing loaders.
    maxTimerRef.current = window.setTimeout(() => {
      maxTimerRef.current = null;
      setRefreshing(false);
    }, MAX_SPIN_MS);
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const value = useMemo(
    () => ({ refreshKey, refreshing, softRefresh, endSoftRefresh }),
    [refreshKey, refreshing, softRefresh, endSoftRefresh]
  );

  return (
    <SoftRefreshContext.Provider value={value}>{children}</SoftRefreshContext.Provider>
  );
}

export function useSoftRefresh() {
  return useContext(SoftRefreshContext);
}

function contentLooksBusy(root) {
  if (!root) return false;
  return Boolean(
    root.querySelector(
      [
        '[aria-busy="true"]',
        ".page-loader",
        ".brand-loader",
        ".agri-loader",
        ".route-fallback",
        ".skeleton",
        ".skeleton-card",
        ".farmers-table-skeleton",
        ".visits-table-skeleton",
        ".employees-hr-skeleton",
        ".dashboard-skeleton",
      ].join(", ")
    )
  );
}

/**
 * Watches the page canvas after a soft remount and ends the refresh
 * indicator once loading UI disappears (with a quiet window).
 */
export function SoftRefreshSettleWatcher({ rootRef }) {
  const soft = useSoftRefresh();
  const refreshKey = soft?.refreshKey ?? 0;
  const refreshing = Boolean(soft?.refreshing);

  useEffect(() => {
    if (!refreshing || !soft?.endSoftRefresh) return undefined;

    const root = rootRef?.current;
    let quietTimer = null;
    let raf1 = 0;
    let raf2 = 0;

    const scheduleQuietSettle = () => {
      if (quietTimer) window.clearTimeout(quietTimer);
      quietTimer = window.setTimeout(() => {
        if (!contentLooksBusy(root)) {
          soft.endSoftRefresh();
        }
      }, QUIET_MS);
    };

    const evaluate = () => {
      if (contentLooksBusy(root)) {
        if (quietTimer) window.clearTimeout(quietTimer);
        return;
      }
      scheduleQuietSettle();
    };

    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(evaluate);
    });

    let observer = null;
    if (root && typeof MutationObserver !== "undefined") {
      observer = new MutationObserver(evaluate);
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "aria-busy"],
      });
    }

    return () => {
      if (quietTimer) window.clearTimeout(quietTimer);
      if (raf1) window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
      observer?.disconnect?.();
    };
  }, [refreshKey, refreshing, soft, rootRef]);

  return null;
}
