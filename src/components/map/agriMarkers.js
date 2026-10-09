import L from "leaflet";
import { MARKER_KIND } from "../../utils/mapMarkerKind.js";

/**
 * Shared Leaflet divIcon factory for agriculture markers.
 * One glossy-pin visual language across every admin map:
 * colored pin + white inner disc + themed glyph.
 */

const KIND_THEME = {
  [MARKER_KIND.VISIT]: { color: "#059669", label: "Field visit" },
  [MARKER_KIND.CROP]: { color: "#65a30d", label: "Crop inspection" },
  [MARKER_KIND.ADVISORY]: { color: "#0d9488", label: "Advisory visit" },
  [MARKER_KIND.PEST]: { color: "#d97706", label: "Pest issue" },
  [MARKER_KIND.DISEASE]: { color: "#dc2626", label: "Disease issue" },
  [MARKER_KIND.IRRIGATION]: { color: "#0284c7", label: "Irrigation visit" },
  [MARKER_KIND.SOIL]: { color: "#7c3aed", label: "Soil diagnostics" },
  [MARKER_KIND.UNKNOWN]: { color: "#64748b", label: "Visit location" },
};

// 24x24 stroke glyphs (lucide-style, simplified paths)
const GLYPHS = {
  [MARKER_KIND.VISIT]:
    '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
  [MARKER_KIND.CROP]:
    '<path d="M12 21V9"/><path d="M12 9c0-3.5-3-5.5-6-5.5 0 3.5 2.5 5.5 6 5.5z"/><path d="M12 9c0-3.5 3-5.5 6-5.5 0 3.5-2.5 5.5-6 5.5z"/><path d="M12 14.5c0-3-2.6-4.8-5.2-4.8 0 3 2.2 4.8 5.2 4.8z"/><path d="M12 14.5c0-3 2.6-4.8 5.2-4.8 0 3-2.2 4.8-5.2 4.8z"/>',
  [MARKER_KIND.ADVISORY]:
    '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  [MARKER_KIND.PEST]:
    '<path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6Z"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.9-3.7 4"/><path d="M18 13h4"/><path d="M21 21c0-2.1-1.7-3.9-3.8-4"/>',
  [MARKER_KIND.DISEASE]:
    '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="m7 15 2-2"/><path d="m14 9 1.5-1.5"/><circle cx="9.5" cy="9.5" r=".5"/><circle cx="15.5" cy="15.5" r=".5"/>',
  [MARKER_KIND.IRRIGATION]:
    '<path d="M12 3.5s6.5 7.3 6.5 11.7a6.5 6.5 0 0 1-13 0C5.5 10.8 12 3.5 12 3.5Z"/><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5"/>',
  [MARKER_KIND.SOIL]:
    '<path d="M10 2v7.3L4.6 18.5A2 2 0 0 0 6.4 21.5h11.2a2 2 0 0 0 1.8-3L14 9.3V2"/><path d="M8.5 2h7"/><path d="M7.5 16h9"/>',
  [MARKER_KIND.UNKNOWN]:
    '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
};

export function markerKindLabel(kind) {
  return KIND_THEME[kind]?.label ?? KIND_THEME[MARKER_KIND.UNKNOWN].label;
}

function pinSvg(color, glyph, size) {
  const pinH = Math.round(size * 1.22);
  const disc = Math.round(size * 0.58);
  return `<svg width="${size}" height="${pinH}" viewBox="0 0 32 40" aria-hidden="true">
    <path d="M16 38.5C16 38.5 3.5 23.9 3.5 15.5a12.5 12.5 0 0 1 25 0C28.5 23.9 16 38.5 16 38.5Z"
      fill="${color}" stroke="rgba(255,255,255,0.95)" stroke-width="1.6"/>
    <circle cx="16" cy="15.5" r="7.4" fill="rgba(255,255,255,0.97)"/>
    <svg x="${16 - disc / 2}" y="${15.5 - disc / 2}" width="${disc}" height="${disc}" viewBox="0 0 24 24"
      fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      ${glyph}
    </svg>
  </svg>`;
}

/**
 * Agriculture-themed visit marker icon.
 * @param {string} kind  one of MARKER_KIND
 */
export function createAgriMarkerIcon(kind, size = 30) {
  const theme = KIND_THEME[kind] ?? KIND_THEME[MARKER_KIND.UNKNOWN];
  const glyph = GLYPHS[kind] ?? GLYPHS[MARKER_KIND.UNKNOWN];
  const pinH = Math.round(size * 1.22);
  return L.divIcon({
    className: "agri-map-marker",
    html: pinSvg(theme.color, glyph, size),
    iconSize: [size, pinH],
    iconAnchor: [size / 2, pinH - 2],
    popupAnchor: [0, -pinH],
    tooltipAnchor: [0, -pinH],
  });
}

/**
 * Compact employee pin (dashboard mini-map) — same family as the
 * tracking live-pin, minus the always-on name pill.
 */
export function createEmployeePinIcon(isOnline) {
  const color = isOnline ? "#059669" : "#94a3b8";
  return L.divIcon({
    className: "agri-map-marker",
    html: `<div style="filter:drop-shadow(0 2px 5px rgba(0,0,0,.35))">${pinSvg(
      color,
      '<circle cx="12" cy="8.5" r="3.2"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>',
      24
    )}</div>`,
    iconSize: [24, 30],
    iconAnchor: [12, 28],
    popupAnchor: [0, -30],
    tooltipAnchor: [0, -30],
  });
}
