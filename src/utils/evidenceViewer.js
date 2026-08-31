/** Shared helpers for admin evidence image inspection viewer. */

export const EVIDENCE_ZOOM_MIN = 0.25;
export const EVIDENCE_ZOOM_MAX = 4;
export const EVIDENCE_ZOOM_STEP = 1.25;

export function evidenceItemKey(item) {
  if (!item) return "";
  return String(
    item.id ??
      item.evidence_key ??
      item.raw?.evidence_key ??
      item.raw?.id ??
      item.filename ??
      ""
  );
}

/** Full-resolution URL for lightbox — never prefer thumbnail when url exists. */
export function resolveEvidenceFullUrl(item) {
  if (!item) return null;
  return item.url || item.file_url || item.fileUrl || null;
}

export function clampEvidenceZoom(value) {
  return Math.min(EVIDENCE_ZOOM_MAX, Math.max(EVIDENCE_ZOOM_MIN, value));
}

/** CSS pixels per image pixel to fit entire image in viewport. */
export function computeEvidenceFitScale(naturalW, naturalH, viewportW, viewportH) {
  if (!naturalW || !naturalH || !viewportW || !viewportH) return 1;
  return Math.min(viewportW / naturalW, viewportH / naturalH);
}

export function isPortraitEvidence(naturalW, naturalH) {
  return naturalH > naturalW * 1.05;
}

export function formatEvidenceZoomPct(scale) {
  return `${Math.round(scale * 100)}%`;
}

/** Clamp pan so some portion of image remains reachable. */
export function clampEvidencePan(pan, displayW, displayH, viewportW, viewportH) {
  if (displayW <= viewportW && displayH <= viewportH) {
    return { x: 0, y: 0 };
  }
  const maxX = Math.max(0, (displayW - viewportW) / 2 + 48);
  const maxY = Math.max(0, (displayH - viewportH) / 2 + 48);
  return {
    x: Math.min(maxX, Math.max(-maxX, pan.x)),
    y: Math.min(maxY, Math.max(-maxY, pan.y)),
  };
}
