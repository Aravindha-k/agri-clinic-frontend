import { useCallback, useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

/**
 * Toggle fullscreen on the map container (native Fullscreen API).
 * @param {{ containerRef: import('react').RefObject<HTMLElement | null> }} props
 */
export default function MapFullscreenButton({ containerRef }) {
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

  return (
    <button
      type="button"
      className="admin-map-fullscreen-btn"
      onClick={toggle}
      aria-label={isFullscreen ? "Exit fullscreen map" : "Fullscreen map"}
      title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
    >
      {isFullscreen ? (
        <Minimize2 className="w-4 h-4" />
      ) : (
        <Maximize2 className="w-4 h-4" />
      )}
    </button>
  );
}
