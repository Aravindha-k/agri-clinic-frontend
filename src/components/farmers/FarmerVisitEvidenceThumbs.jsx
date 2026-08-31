import { useMemo, useState, useCallback } from "react";
import { ImageIcon } from "lucide-react";
import { resolveAttachmentUrl } from "../../utils/visitAttachments";
import { evidenceItemKey } from "../../utils/evidenceViewer";
import EvidenceImageViewer from "../visits/EvidenceImageViewer";

function isImagePreview(item) {
  const type = String(item?.type || item?.mime_type || "").toLowerCase();
  return type.includes("image") || type === "photo" || type === "picture";
}

function previewSrc(item) {
  return resolveAttachmentUrl(item?.file_url || item?.url || item?.thumbnail_url);
}

function toViewerItem(item, visit) {
  const url = resolveAttachmentUrl(item?.file_url || item?.url);
  return {
    id: item.evidence_key || item.id,
    evidence_key: item.evidence_key,
    url,
    thumbnailUrl: resolveAttachmentUrl(item?.thumbnail_url) || url,
    filename: item.filename || item.name || "Evidence image",
    uploadedBy: visit?.employee_name ?? visit?.conducted_by_name,
    uploadedAtLabel: visit?.visit_date ? String(visit.visit_date) : null,
    kind: "image",
    raw: item,
  };
}

function Thumb({ item, broken, onBroken, onOpen }) {
  const src = previewSrc(item);
  if (!src || broken) {
    return (
      <button
        type="button"
        className="farmer-visit-evidence-thumb farmer-visit-evidence-thumb--fallback"
        aria-label="Evidence image unavailable"
        onClick={onOpen}
      >
        <ImageIcon className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
      </button>
    );
  }
  return (
    <button
      type="button"
      className="farmer-visit-evidence-thumb"
      onClick={onOpen}
      aria-label="Open evidence preview"
    >
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className="farmer-visit-evidence-thumb__img"
        onError={onBroken}
      />
    </button>
  );
}

/**
 * Read-only image thumbs from farmer visit `evidence_preview`.
 * Does not fetch /attachments/ per visit.
 */
export default function FarmerVisitEvidenceThumbs({ visit }) {
  const [previewIndex, setPreviewIndex] = useState(null);
  const [broken, setBroken] = useState(() => new Set());

  const viewerItems = useMemo(() => {
    const rows = Array.isArray(visit?.evidence_preview) ? visit.evidence_preview : [];
    return rows.filter(isImagePreview).map((item) => toViewerItem(item, visit));
  }, [visit]);

  const openPreview = useCallback(
    (item) => {
      const key = evidenceItemKey(item);
      const idx = viewerItems.findIndex((row) => evidenceItemKey(row) === key);
      setPreviewIndex(idx >= 0 ? idx : 0);
    },
    [viewerItems]
  );

  const evidenceCount = Number(visit?.evidence_count);
  const totalCount = Number.isFinite(evidenceCount)
    ? evidenceCount
    : Array.isArray(visit?.evidence_preview)
      ? visit.evidence_preview.length
      : 0;
  const extraCount = Math.max(totalCount - (Array.isArray(visit?.evidence_preview) ? visit.evidence_preview.length : 0), 0);

  const viewerContext = useMemo(
    () => ({
      visitId: visit?.id,
      farmerName: visit?.farmer_name,
      employeeName: visit?.employee_name ?? visit?.conducted_by_name,
      location: visit?.village || visit?.district || null,
    }),
    [visit]
  );

  if (viewerItems.length === 0 && totalCount <= 0) return null;

  return (
    <div
      className="farmer-visit-evidence"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {viewerItems.length > 0 ? (
        <div className="farmer-visit-evidence__row">
          {viewerItems.map((item, index) => {
            const key = item.evidence_key || evidenceItemKey(item) || `preview-${index}`;
            const raw = item.raw ?? item;
            return (
              <Thumb
                key={key}
                item={raw}
                broken={broken.has(key)}
                onBroken={() =>
                  setBroken((prev) => {
                    const next = new Set(prev);
                    next.add(key);
                    return next;
                  })
                }
                onOpen={() => openPreview(item)}
              />
            );
          })}
          {extraCount > 0 ? (
            <span className="farmer-visit-evidence__more" aria-label={`${extraCount} more evidence files`}>
              +{extraCount}
            </span>
          ) : null}
        </div>
      ) : totalCount > 0 ? (
        <p className="farmer-visit-evidence__count">{totalCount} evidence file{totalCount === 1 ? "" : "s"}</p>
      ) : null}
      <EvidenceImageViewer
        open={previewIndex !== null}
        items={viewerItems}
        index={previewIndex ?? 0}
        onIndexChange={setPreviewIndex}
        onClose={() => setPreviewIndex(null)}
        context={viewerContext}
      />
    </div>
  );
}
