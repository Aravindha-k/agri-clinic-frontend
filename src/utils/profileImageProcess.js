/** Profile photo processing — square crop + compress before upload. */

export const PROFILE_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/jpg";
export const PROFILE_PHOTO_ACCEPT_LABEL = "JPG, PNG or WebP";

export const PROFILE_PHOTO_OUTPUT_SIZE = 512;
export const PROFILE_PHOTO_TARGET_BYTES = 1024 * 1024;
export const PROFILE_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const PROFILE_PHOTO_PICK_MAX_BYTES = 15 * 1024 * 1024;

const MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

/**
 * @param {File} file
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateProfilePhotoFile(file) {
  if (!file) {
    return { ok: false, message: "No file selected." };
  }

  const type = (file.type || "").toLowerCase();
  if (!MIME_TYPES.has(type)) {
    return {
      ok: false,
      message: `Invalid file type. Use ${PROFILE_PHOTO_ACCEPT_LABEL}.`,
    };
  }

  if (file.size > PROFILE_PHOTO_PICK_MAX_BYTES) {
    return {
      ok: false,
      message: `Image is too large to process. Pick a file under ${Math.round(PROFILE_PHOTO_PICK_MAX_BYTES / (1024 * 1024))} MB.`,
    };
  }

  return { ok: true };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image."));
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * @param {string} imageSrc object URL or data URL
 * @param {{ x: number, y: number, width: number, height: number }} cropPixels
 * @param {number} [outputSize]
 */
export async function cropImageToCanvas(imageSrc, cropPixels, outputSize = PROFILE_PHOTO_OUTPUT_SIZE) {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare image.");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return canvas;
}

/**
 * Compress canvas to WebP or JPEG under target size.
 * @returns {Promise<{ file: File, blob: Blob, size: number, mime: string }>}
 */
export async function compressCanvasToProfileFile(canvas, baseName = "profile-photo") {
  const attempts = [
    { type: "image/webp", qualities: [0.82, 0.72, 0.62, 0.52, 0.42] },
    { type: "image/jpeg", qualities: [0.82, 0.72, 0.62, 0.52, 0.42] },
  ];

  let best = null;

  for (const { type, qualities } of attempts) {
    for (const quality of qualities) {
      const blob = await canvasToBlob(canvas, type, quality);
      if (!blob) continue;

      if (!best || blob.size < best.blob.size) {
        best = { blob, mime: type };
      }

      if (blob.size <= PROFILE_PHOTO_TARGET_BYTES) {
        best = { blob, mime: type };
        break;
      }
    }

    if (best && best.blob.size <= PROFILE_PHOTO_TARGET_BYTES) break;
  }

  if (!best?.blob) {
    throw new Error("Could not compress image.");
  }

  if (best.blob.size > PROFILE_PHOTO_MAX_BYTES) {
    const mb = (best.blob.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `Photo is still too large (${mb} MB) after compression. Try a simpler image or smaller crop.`
    );
  }

  const ext = best.mime === "image/webp" ? "webp" : "jpg";
  const safeBase = baseName.replace(/[^\w.-]+/g, "-").slice(0, 40) || "profile-photo";
  const file = new File([best.blob], `${safeBase}.${ext}`, {
    type: best.mime,
    lastModified: Date.now(),
  });

  return { file, blob: best.blob, size: best.blob.size, mime: best.mime };
}

/**
 * Full pipeline: crop area → square file ready for upload.
 */
export async function buildCroppedProfilePhotoFile(
  imageSrc,
  croppedAreaPixels,
  baseName = "profile-photo"
) {
  const canvas = await cropImageToCanvas(imageSrc, croppedAreaPixels);
  return compressCanvasToProfileFile(canvas, baseName);
}

export function formatProfilePhotoSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function resolvePhotoUploadError(err) {
  const status = err?.response?.status;
  if (status === 413) {
    return "Photo is too large for the server. Use a smaller image or crop again.";
  }

  const data = err?.response?.data;
  const msg =
    data?.message ??
    data?.errors?.profile_photo ??
    (Array.isArray(data?.errors?.profile_photo)
      ? data.errors.profile_photo[0]
      : null) ??
    err?.message;

  if (typeof msg === "string" && msg.trim()) return msg;
  return "Failed to upload photo. Please try again.";
}
