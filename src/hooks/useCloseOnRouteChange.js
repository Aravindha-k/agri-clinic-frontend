import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Invoke `onClose` when the route changes (clears stale modal/drawer state).
 */
export default function useCloseOnRouteChange(onClose, enabled = true) {
  const location = useLocation();

  useEffect(() => {
    if (!enabled || typeof onClose !== "function") return;
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
}
