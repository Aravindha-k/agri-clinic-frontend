import { useCallback, useEffect, useState } from "react";
import { Minimize2, Maximize2 } from "lucide-react";

/**
 * Toggle fullscreen on the map container (native Fullscreen API).
 * @param {{ containerRef: import('react').RefObject<HTMLElement | null>, className?: string }} props
 */
export default function MapFullscreenButton({ containerRef, className = "admin-map-fullscreen-btn" }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [containerRef]);

  const toggle = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;

    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      /* unsupported or denied */
    }
  }, [containerRef]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && document.fullscreenElement === containerRef.current) {
        document.exitFullscreen?.();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [containerRef]);

  return (
    <button
      type="button"
      className={className}
      onClick={toggle}
      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen map"}
      title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
    >
      {isFullscreen ? (
        <>
          <Minimize2 className="w-4 h-4" aria-hidden="true" />
          <span className="admin-map-toolbar__label">Exit</span>
        </>
      ) : (
        <>
          <Maximize2 className="w-4 h-4" aria-hidden="true" />
          <span className="admin-map-toolbar__label">Fullscreen</span>
        </>
      )}
    </button>
  );
}
