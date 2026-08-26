import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImageIcon, X } from "lucide-react";
import { useOverlayLock } from "../../utils/overlayLock";
import { resolveAttachmentUrl } from "../../utils/visitAttachments";

function isImagePreview(item) {
  const type = String(item?.type || item?.mime_type || "").toLowerCase();
  return type.includes("image") || type === "photo" || type === "picture";
}

function previewSrc(item) {
  return resolveAttachmentUrl(item?.file_url || item?.url || item?.thumbnail_url);
}

function fullImageSrc(item) {
  return resolveAttachmentUrl(item?.file_url || item?.url) || previewSrc(item);
}

function ImagePreviewModal({ item, onClose }) {
  const panelRef = useRef(null);
  useOverlayLock({
    open: Boolean(item),
    onClose,
    panelRef,
    trapFocus: true,
  });

  if (!item) return null;
  const src = fullImageSrc(item);

  return createPortal(
    <div
      ref={panelRef}
      className="visit-evidence-preview"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <div
        className="visit-evidence-preview__backdrop"
        aria-hidden="true"
        onClick={onClose}
      />
      <button
        type="button"
        onClick={onClose}
        className="visit-evidence-preview__close"
        aria-label="Close image preview"
      >
        <X className="w-5 h-5" aria-hidden="true" />
      </button>
      <div
        className="visit-evidence-preview__shell"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="visit-evidence-preview__stage">
          {src ? (
            <img
              src={src}
              alt="Visit evidence"
              className="visit-evidence-preview__img"
            />
          ) : (
            <p className="visit-evidence-preview__unavailable">Preview unavailable for this file.</p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
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
  const [preview, setPreview] = useState(null);
  const [broken, setBroken] = useState(() => new Set());

  const previewItems = useMemo(() => {
    const rows = Array.isArray(visit?.evidence_preview) ? visit.evidence_preview : [];
    return rows.filter(isImagePreview);
  }, [visit]);

  const evidenceCount = Number(visit?.evidence_count);
  const totalCount = Number.isFinite(evidenceCount)
    ? evidenceCount
    : Array.isArray(visit?.evidence_preview)
      ? visit.evidence_preview.length
      : 0;
  const extraCount = Math.max(totalCount - (Array.isArray(visit?.evidence_preview) ? visit.evidence_preview.length : 0), 0);

  if (previewItems.length === 0 && totalCount <= 0) return null;

  return (
    <div
      className="farmer-visit-evidence"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {previewItems.length > 0 ? (
        <div className="farmer-visit-evidence__row">
          {previewItems.map((item, index) => {
            const key = item.evidence_key || `preview-${index}`;
            return (
              <Thumb
                key={key}
                item={item}
                broken={broken.has(key)}
                onBroken={() =>
                  setBroken((prev) => {
                    const next = new Set(prev);
                    next.add(key);
                    return next;
                  })
                }
                onOpen={() => setPreview(item)}
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
      <ImagePreviewModal item={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
