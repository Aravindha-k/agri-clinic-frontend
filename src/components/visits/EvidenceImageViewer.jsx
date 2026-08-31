import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { useOverlayLock } from "../../utils/overlayLock";
import {
  clampEvidencePan,
  clampEvidenceZoom,
  computeEvidenceFitScale,
  evidenceItemKey,
  formatEvidenceZoomPct,
  isPortraitEvidence,
  resolveEvidenceFullUrl,
  EVIDENCE_ZOOM_STEP,
} from "../../utils/evidenceViewer";

const VIEW_MODES = {
  FIT: "fit",
  ACTUAL: "actual",
  ZOOM: "zoom",
};

function InfoRow({ label, value }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="evidence-viewer__info-row">
      <dt>{label}</dt>
      <dd title={typeof value === "string" ? value : undefined}>{value}</dd>
    </div>
  );
}

function ToolbarButton({ label, onClick, disabled, children, className = "" }) {
  return (
    <button
      type="button"
      className={`evidence-viewer__tool-btn ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

/**
 * Desktop/tablet evidence inspection lightbox with fit/zoom/pan and multi-image nav.
 */
export default function EvidenceImageViewer({
  open,
  items = [],
  index = 0,
  onIndexChange,
  onClose,
  context = null,
}) {
  const panelRef = useRef(null);
  const viewportRef = useRef(null);
  const workspaceRef = useRef(null);
  const imgRef = useRef(null);
  const dragRef = useRef(null);
  const pinchRef = useRef(null);

  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  const [viewMode, setViewMode] = useState(VIEW_MODES.FIT);
  const [userScale, setUserScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPanel, setShowPanel] = useState(true);

  const imageItems = useMemo(
    () => (Array.isArray(items) ? items.filter(Boolean) : []),
    [items]
  );

  const safeIndex = Math.min(
    Math.max(index, 0),
    Math.max(imageItems.length - 1, 0)
  );
  const activeItem = imageItems[safeIndex] ?? null;
  const src = resolveEvidenceFullUrl(activeItem);
  const hasMultiple = imageItems.length > 1;

  const fitScale = useMemo(
    () =>
      computeEvidenceFitScale(
        naturalSize.w,
        naturalSize.h,
        viewportSize.w,
        viewportSize.h
      ),
    [naturalSize, naturalSize.w, naturalSize.h, viewportSize, viewportSize.w, viewportSize.h]
  );

  const effectiveScale = useMemo(() => {
    if (viewMode === VIEW_MODES.FIT) return fitScale;
    if (viewMode === VIEW_MODES.ACTUAL) return 1;
    return clampEvidenceZoom(userScale);
  }, [viewMode, fitScale, userScale]);

  const displayW = naturalSize.w * effectiveScale;
  const displayH = naturalSize.h * effectiveScale;
  const isPortrait = isPortraitEvidence(naturalSize.w, naturalSize.h);
  const canPan =
    viewMode !== VIEW_MODES.FIT &&
    (displayW > viewportSize.w + 2 || displayH > viewportSize.h + 2);

  const zoomLabel = formatEvidenceZoomPct(
    viewMode === VIEW_MODES.FIT ? fitScale : effectiveScale
  );

  const resetView = useCallback(() => {
    setViewMode(VIEW_MODES.FIT);
    setUserScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const setFit = useCallback(() => {
    setViewMode(VIEW_MODES.FIT);
    setPan({ x: 0, y: 0 });
  }, []);

  const setActual = useCallback(() => {
    setViewMode(VIEW_MODES.ACTUAL);
    setUserScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const zoomBy = useCallback(
    (factor) => {
      setViewMode(VIEW_MODES.ZOOM);
      setUserScale((prev) => {
        const base = viewMode === VIEW_MODES.FIT ? fitScale : prev;
        return clampEvidenceZoom(base * factor);
      });
    },
    [fitScale, viewMode]
  );

  const goPrev = useCallback(() => {
    if (!hasMultiple || safeIndex <= 0) return;
    onIndexChange?.(safeIndex - 1);
  }, [hasMultiple, onIndexChange, safeIndex]);

  const goNext = useCallback(() => {
    if (!hasMultiple || safeIndex >= imageItems.length - 1) return;
    onIndexChange?.(safeIndex + 1);
  }, [hasMultiple, imageItems.length, onIndexChange, safeIndex]);

  useOverlayLock({
    open,
    onClose,
    panelRef,
    trapFocus: true,
  });

  useEffect(() => {
    if (!open) return undefined;
    resetView();
    setNaturalSize({ w: 0, h: 0 });
    return undefined;
  }, [open, safeIndex, resetView]);

  useEffect(() => {
    if (!open || !viewportRef.current) return undefined;
    const node = viewportRef.current;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setViewportSize({ w: width, h: height });
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const ids = [safeIndex - 1, safeIndex + 1];
    ids.forEach((i) => {
      const url = resolveEvidenceFullUrl(imageItems[i]);
      if (!url) return;
      const img = new Image();
      img.decoding = "async";
      img.src = url;
    });
    return undefined;
  }, [open, safeIndex, imageItems]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomBy(EVIDENCE_ZOOM_STEP);
        return;
      }
      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoomBy(1 / EVIDENCE_ZOOM_STEP);
        return;
      }
      if (event.key === "0") {
        event.preventDefault();
        resetView();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, zoomBy, resetView, goPrev, goNext]);

  useEffect(() => {
    if (!open) return undefined;
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [open]);

  useEffect(() => {
    if (!open && document.fullscreenElement === workspaceRef.current) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, [open]);

  const handleImageLoad = useCallback((event) => {
    const img = event.currentTarget;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

  const handleWheel = useCallback(
    (event) => {
      if (!open) return;
      event.preventDefault();
      const factor = event.deltaY < 0 ? EVIDENCE_ZOOM_STEP : 1 / EVIDENCE_ZOOM_STEP;
      zoomBy(factor);
    },
    [open, zoomBy]
  );

  const handleDoubleClick = useCallback(() => {
    if (viewMode === VIEW_MODES.FIT) {
      setActual();
      return;
    }
    resetView();
  }, [viewMode, setActual, resetView]);

  const handlePointerDown = useCallback(
    (event) => {
      if (!canPan || event.button !== 0) return;
      dragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        panX: pan.x,
        panY: pan.y,
        pointerId: event.pointerId,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [canPan, pan.x, pan.y]
  );

  const handlePointerMove = useCallback(
    (event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const next = clampEvidencePan(
        {
          x: drag.panX + (event.clientX - drag.startX),
          y: drag.panY + (event.clientY - drag.startY),
        },
        displayW,
        displayH,
        viewportSize.w,
        viewportSize.h
      );
      setPan(next);
    },
    [displayH, displayW, viewportSize.h, viewportSize.w]
  );

  const handlePointerUp = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const handleTouchStart = useCallback(
    (event) => {
      if (event.touches.length === 2) {
        const [a, b] = event.touches;
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        pinchRef.current = {
          dist,
          scale: viewMode === VIEW_MODES.FIT ? fitScale : effectiveScale,
        };
      }
    },
    [effectiveScale, fitScale, viewMode]
  );

  const handleTouchMove = useCallback(
    (event) => {
      if (event.touches.length !== 2 || !pinchRef.current) return;
      event.preventDefault();
      const [a, b] = event.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const ratio = dist / pinchRef.current.dist;
      setViewMode(VIEW_MODES.ZOOM);
      setUserScale(clampEvidenceZoom(pinchRef.current.scale * ratio));
    },
    []
  );

  const handleTouchEnd = useCallback(() => {
    pinchRef.current = null;
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const node = workspaceRef.current;
    if (!node) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await node.requestFullscreen();
      }
    } catch {
      /* ignore unsupported */
    }
  }, []);

  const infoRows = useMemo(() => {
    const ctx = context && typeof context === "object" ? context : {};
    return {
      uploadedAt: activeItem?.uploadedAtLabel,
      employee: activeItem?.uploadedBy ?? ctx.employeeName,
      farmer: ctx.farmerName,
      visitId: ctx.visitId,
      location: ctx.location,
      source: ctx.source ?? "Mobile field capture",
      filename: activeItem?.filename,
      fileSize: activeItem?.fileSizeLabel,
    };
  }, [activeItem, context]);

  const hasInfoPanelContent = useMemo(
    () =>
      Object.entries(infoRows).some(
        ([key, value]) => key !== "source" && value != null && value !== "" && value !== "—"
      ),
    [infoRows]
  );

  if (!open || !activeItem) return null;

  const panelVisible =
    hasInfoPanelContent &&
    showPanel &&
    (isPortrait ? viewportSize.w >= 768 : viewportSize.w >= 1024);

  return createPortal(
    <div
      ref={panelRef}
      className="evidence-viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Evidence image inspection viewer"
    >
      <div
        className="evidence-viewer__backdrop"
        aria-hidden="true"
        onClick={onClose}
      />

      <div ref={workspaceRef} className="evidence-viewer__workspace">
        <header className="evidence-viewer__toolbar">
          <div className="evidence-viewer__toolbar-start">
            <p className="evidence-viewer__filename" title={activeItem.filename || undefined}>
              {activeItem.filename || "Evidence image"}
            </p>
            {hasMultiple ? (
              <span className="evidence-viewer__counter" aria-live="polite">
                {safeIndex + 1} / {imageItems.length}
              </span>
            ) : null}
          </div>

          <div className="evidence-viewer__toolbar-center" role="toolbar" aria-label="Image zoom controls">
            <ToolbarButton label="Zoom out" onClick={() => zoomBy(1 / EVIDENCE_ZOOM_STEP)}>
              <Minus className="w-4 h-4" aria-hidden="true" />
            </ToolbarButton>
            <span className="evidence-viewer__zoom-label" aria-live="polite">
              {zoomLabel}
            </span>
            <ToolbarButton label="Zoom in" onClick={() => zoomBy(EVIDENCE_ZOOM_STEP)}>
              <Plus className="w-4 h-4" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton label="Fit image to viewer" onClick={setFit}>
              Fit
            </ToolbarButton>
            <ToolbarButton label="Actual size (100%)" onClick={setActual}>
              100%
            </ToolbarButton>
            <ToolbarButton label="Reset zoom and pan" onClick={resetView}>
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
            </ToolbarButton>
          </div>

          <div className="evidence-viewer__toolbar-end">
            {src ? (
              <>
                <ToolbarButton
                  label="Open original in new tab"
                  onClick={() => window.open(src, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                </ToolbarButton>
                <a
                  href={src}
                  download={activeItem.filename || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="evidence-viewer__tool-btn"
                  aria-label="Download original image"
                  title="Download original image"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                </a>
              </>
            ) : null}
            <ToolbarButton
              label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              onClick={toggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Maximize2 className="w-4 h-4" aria-hidden="true" />
              )}
            </ToolbarButton>
            {hasInfoPanelContent ? (
              <ToolbarButton
                label={showPanel ? "Hide evidence details" : "Show evidence details"}
                onClick={() => setShowPanel((v) => !v)}
                className="evidence-viewer__tool-btn--panel-toggle"
              >
                Details
              </ToolbarButton>
            ) : null}
            <ToolbarButton label="Close viewer" onClick={onClose}>
              <X className="w-4 h-4" aria-hidden="true" />
            </ToolbarButton>
          </div>
        </header>

        <div
          className={`evidence-viewer__body${isPortrait ? " evidence-viewer__body--portrait" : ""}${panelVisible ? " evidence-viewer__body--with-panel" : ""}`}
        >
          {hasMultiple ? (
            <button
              type="button"
              className="evidence-viewer__nav evidence-viewer__nav--prev"
              onClick={goPrev}
              disabled={safeIndex <= 0}
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" aria-hidden="true" />
            </button>
          ) : null}

          <div className="evidence-viewer__canvas-wrap">
            <div
              ref={viewportRef}
              className="evidence-viewer__viewport"
              onWheel={handleWheel}
              onDoubleClick={handleDoubleClick}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ cursor: canPan ? "grab" : "default" }}
            >
              {src ? (
                <div
                  className="evidence-viewer__img-layer"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px)`,
                  }}
                >
                  <img
                    ref={imgRef}
                    key={`${evidenceItemKey(activeItem)}-${src}`}
                    src={src}
                    alt={activeItem.filename || "Visit evidence"}
                    className="evidence-viewer__img"
                    width={naturalSize.w || undefined}
                    height={naturalSize.h || undefined}
                    style={
                      naturalSize.w
                        ? {
                            width: displayW,
                            height: displayH,
                          }
                        : undefined
                    }
                    draggable={false}
                    decoding="async"
                    onLoad={handleImageLoad}
                  />
                </div>
              ) : (
                <p className="evidence-viewer__unavailable">Preview unavailable for this file.</p>
              )}
            </div>
          </div>

          {panelVisible ? (
            <aside className="evidence-viewer__panel" aria-label="Evidence details">
              <h3 className="evidence-viewer__panel-title">Evidence details</h3>
              <dl className="evidence-viewer__info">
                <InfoRow label="Uploaded" value={infoRows.uploadedAt} />
                <InfoRow label="Employee" value={infoRows.employee} />
                <InfoRow label="Farmer" value={infoRows.farmer} />
                <InfoRow label="Visit" value={infoRows.visitId ? `#${infoRows.visitId}` : null} />
                <InfoRow label="Location" value={infoRows.location} />
                <InfoRow label="Source" value={infoRows.source} />
                <InfoRow label="Filename" value={infoRows.filename} />
                <InfoRow label="File size" value={infoRows.fileSize} />
              </dl>
            </aside>
          ) : null}

          {hasMultiple ? (
            <button
              type="button"
              className="evidence-viewer__nav evidence-viewer__nav--next"
              onClick={goNext}
              disabled={safeIndex >= imageItems.length - 1}
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {hasInfoPanelContent && !panelVisible ? (
          <footer className="evidence-viewer__footer">
            <dl className="evidence-viewer__info evidence-viewer__info--compact">
              <InfoRow label="Uploaded" value={infoRows.uploadedAt} />
              <InfoRow label="Employee" value={infoRows.employee} />
              <InfoRow label="Visit" value={infoRows.visitId ? `#${infoRows.visitId}` : null} />
            </dl>
          </footer>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
