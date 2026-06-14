const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_FILES = 12;

const ALLOWED_PREFIXES = ["image/", "audio/", "video/", "application/pdf"];
const ALLOWED_EXT = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".webp", ".gif"];

function isAllowedFile(file) {
  const mime = (file?.type || "").toLowerCase();
  const name = (file?.name || "").toLowerCase();
  if (ALLOWED_PREFIXES.some((p) => mime.startsWith(p))) return true;
  if (mime.includes("word") || mime.includes("document") || mime.includes("sheet")) return true;
  return ALLOWED_EXT.some((ext) => name.endsWith(ext));
}

/** Client-side validation for visit attachment picks (before upload). */
export function validateVisitMediaFiles(files = []) {
  if (!files.length) return {};

  const errors = {};
  if (files.length > MAX_FILES) {
    errors.media = `You can attach up to ${MAX_FILES} files.`;
    return errors;
  }

  const invalid = [];
  const oversized = [];
  for (const item of files) {
    const file = item.file ?? item;
    if (!file) continue;
    if (file.size > MAX_FILE_BYTES) oversized.push(file.name);
    if (!isAllowedFile(file)) invalid.push(file.name);
  }

  if (oversized.length) {
    errors.media = `Each file must be under 15 MB: ${oversized.join(", ")}`;
  } else if (invalid.length) {
    errors.media = `Unsupported file type: ${invalid.join(", ")}`;
  }

  return errors;
}

export { MAX_FILES as VISIT_MEDIA_MAX_FILES };
