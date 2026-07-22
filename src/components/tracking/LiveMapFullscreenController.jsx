import { useEffect, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import {
  fitLiveEmployeeCamera,
  mapViewContainsAllMarkers,
  restoreMapCamera,
  saveMapCamera,
} from "../../utils/liveMapCamera";

/**
 * Fullscreen enter/exit camera + invalidateSize for live tracking map.
 * Preserves embedded view on exit; fits employee bounds on enter when needed.
 */
export default function LiveMapFullscreenController({ locations = [] }) {
  const map = useMap();
  const savedViewRef = useRef(null);
  const wasFullscreenRef = useRef(false);
  const pendingTimerRef = useRef(0);

  useMapEvents({
    zoomstart() {
      try {
        map.closeTooltip();
      } catch {
        /* ignore */
      }
    },
  });

  useEffect(() => {
    if (!map) return undefined;

    const frame = map.getContainer()?.closest(".admin-map-frame");
    if (!frame) return undefined;

    const schedule = (fn) => {
      window.clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = window.setTimeout(fn, 160);
    };

    const onFullscreenChange = () => {
      const isFs = document.fullscreenElement === frame;

      if (isFs && !wasFullscreenRef.current) {
        wasFullscreenRef.current = true;
        savedViewRef.current = saveMapCamera(map);
        try {
          map.closePopup();
          map.closeTooltip();
        } catch {
          /* ignore */
        }

        schedule(() => {
          try {
            map.invalidateSize({ animate: false });
            if (locations.length && !mapViewContainsAllMarkers(map, locations)) {
              fitLiveEmployeeCamera(map, locations, "fullscreen");
            }
          } catch {
            /* unmounting */
          }
        });
        return;
      }

      if (!isFs && wasFullscreenRef.current) {
        wasFullscreenRef.current = false;
        const saved = savedViewRef.current;
        try {
          map.closePopup();
          map.closeTooltip();
        } catch {
          /* ignore */
        }

        schedule(() => {
          try {
            map.invalidateSize({ animate: false });
            restoreMapCamera(map, saved);
          } catch {
            /* unmounting */
          }
        });
      }
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.clearTimeout(pendingTimerRef.current);
    };
  }, [map, locations]);

  return null;
}
