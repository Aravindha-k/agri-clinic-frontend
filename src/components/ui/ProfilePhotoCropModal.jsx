import { useCallback, useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { AlertCircle, Loader2, X, ZoomIn } from "lucide-react";
import {
  buildCroppedProfilePhotoFile,
  formatProfilePhotoSize,
  PROFILE_PHOTO_OUTPUT_SIZE,
  PROFILE_PHOTO_TARGET_BYTES,
} from "../../utils/profileImageProcess";

/**
 * Square crop modal for profile photos before upload.
 */
export default function ProfilePhotoCropModal({
  open,
  imageSrc,
  fileName = "profile-photo",
  onClose,
  onConfirm,
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewSize, setPreviewSize] = useState(null);
  const previewUrlRef = useRef(null);

  const clearPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setPreviewSize(null);
  }, []);

  useEffect(() => {
    if (!open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setProcessing(false);
      setPreviewing(false);
      setError(null);
      clearPreview();
    }
  }, [open, clearPreview]);

  useEffect(() => {
    return () => clearPreview();
  }, [clearPreview]);

  const onCropComplete = useCallback((_area, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  useEffect(() => {
    if (!open || !imageSrc || !croppedAreaPixels) return undefined;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setPreviewing(true);
      setError(null);
      try {
        const { file, size } = await buildCroppedProfilePhotoFile(
          imageSrc,
          croppedAreaPixels,
          fileName
        );
        if (cancelled) return;
        clearPreview();
        const url = URL.createObjectURL(file);
        previewUrlRef.current = url;
        setPreviewUrl(url);
        setPreviewSize(size);
      } catch (err) {
        if (!cancelled) {
          clearPreview();
          setError(err?.message ?? "Could not prepare image.");
        }
      } finally {
        if (!cancelled) setPreviewing(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, imageSrc, croppedAreaPixels, crop, zoom, fileName, clearPreview]);

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels || !onConfirm) return;
    setError(null);
    setProcessing(true);
    try {
      const { file } = await buildCroppedProfilePhotoFile(
        imageSrc,
        croppedAreaPixels,
        fileName
      );
      await onConfirm(file);
    } catch (err) {
      setError(err?.message ?? "Could not prepare image.");
    } finally {
      setProcessing(false);
    }
  };

  if (!open || !imageSrc) return null;

  const busy = processing || previewing;

  return (
    <div
      className="profile-crop-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-crop-title"
    >
      <button
        type="button"
        className="profile-crop-modal__backdrop"
        aria-label="Close"
        onClick={busy ? undefined : onClose}
      />

      <div className="profile-crop-modal__panel">
        <div className="profile-crop-modal__header">
          <div>
            <h2 id="profile-crop-title" className="profile-crop-modal__title">
              Crop profile photo
            </h2>
            <p className="profile-crop-modal__subtitle">
              Square crop · {PROFILE_PHOTO_OUTPUT_SIZE}×{PROFILE_PHOTO_OUTPUT_SIZE}px · compressed under 1 MB
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="profile-crop-modal__close"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="profile-crop-modal__body">
          <div className="profile-crop-modal__crop-area">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          <div className="profile-crop-modal__sidebar">
            <p className="profile-crop-modal__label">Preview</p>
            <div className="profile-crop-modal__preview-wrap">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Cropped preview"
                  className="profile-crop-modal__preview-img"
                />
              ) : (
                <div className="profile-crop-modal__preview-placeholder">
                  {previewing ? (
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  ) : (
                    <span className="text-xs text-slate-400">Adjust crop</span>
                  )}
                </div>
              )}
            </div>

            {previewSize != null ? (
              <p className="profile-crop-modal__meta">
                {formatProfilePhotoSize(previewSize)}
                {previewSize <= PROFILE_PHOTO_TARGET_BYTES ? (
                  <span className="text-emerald-600"> · Ready</span>
                ) : null}
              </p>
            ) : null}

            <label className="profile-crop-modal__zoom">
              <ZoomIn className="w-4 h-4 text-slate-500" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                disabled={busy}
              />
            </label>
          </div>
        </div>

        {error ? (
          <p className="profile-crop-modal__error">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </p>
        ) : null}

        <div className="profile-crop-modal__actions">
          <button
            type="button"
            className="btn btn-secondary btn-md"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-md"
            onClick={handleUpload}
            disabled={busy || !croppedAreaPixels}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading…
              </>
            ) : (
              "Save photo"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
