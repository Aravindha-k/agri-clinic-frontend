import assert from "node:assert/strict";
import {
  clampEvidenceZoom,
  computeEvidenceFitScale,
  evidenceItemKey,
  formatEvidenceZoomPct,
  isPortraitEvidence,
  resolveEvidenceFullUrl,
  EVIDENCE_ZOOM_MIN,
  EVIDENCE_ZOOM_MAX,
} from "./evidenceViewer.js";

assert.equal(evidenceItemKey({ id: 42 }), "42");
assert.equal(evidenceItemKey({ evidence_key: "ev-1" }), "ev-1");
assert.equal(resolveEvidenceFullUrl({ url: "/media/a.jpg", thumbnailUrl: "/t.jpg" }), "/media/a.jpg");
assert.equal(clampEvidenceZoom(0.1), EVIDENCE_ZOOM_MIN);
assert.equal(clampEvidenceZoom(9), EVIDENCE_ZOOM_MAX);
assert.equal(formatEvidenceZoomPct(1), "100%");

const portraitFit = computeEvidenceFitScale(1080, 1920, 1200, 800);
assert.ok(portraitFit > 0.35 && portraitFit < 0.45, `portrait fit ${portraitFit}`);

const landscapeFit = computeEvidenceFitScale(1920, 1080, 1200, 800);
assert.ok(landscapeFit > 0.55 && landscapeFit < 0.65, `landscape fit ${landscapeFit}`);

assert.equal(isPortraitEvidence(1080, 1920), true);
assert.equal(isPortraitEvidence(1920, 1080), false);

console.log("evidenceViewer regression checks OK");
