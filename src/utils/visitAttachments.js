/**
 * Normalize visit attachment/evidence records from admin API.
 */

import { getApiOrigin } from "../config/api";

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "heic", "heif"]);
const PDF_EXT = new Set(["pdf"]);
const AUDIO_EXT = new Set(["mp3", "wav", "ogg", "m4a", "aac", "webm", "opus", "amr", "3gp"]);
const DOC_EXT = new Set(["doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "rtf"]);

export const ATTACHMENT_KIND = {
  IMAGE: "image",
  PDF: "pdf",
  DOCUMENT: "document",
  AUDIO: "audio",
  TEXT: "text",
  OTHER: "other",
};

function extOf(name) {
  if (!name || typeof name !== "string") return "";
  const base = name.split("?")[0].split("#")[0];
  const i = base.lastIndexOf(".");
  return i >= 0 ? base.slice(i + 1).toLowerCase() : "";
}

function basenameFromUrl(url) {
  if (!url || typeof url !== "string") return "";
  try {
    const path = url.startsWith("http") ? new URL(url).pathname : url;
    const parts = path.split("/").filter(Boolean);
    return decodeURIComponent(parts[parts.length - 1] || "");
  } catch {
    const parts = String(url).split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  }
}

/** Resolve relative media paths against API host (not /api/v1 prefix). */
export function resolveAttachmentUrl(raw) {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("blob:") || s.startsWith("data:")) return s;

  let origin = getApiOrigin();
  try {
    if (!origin && typeof window !== "undefined") {
      origin = window.location.origin;
    }
  } catch {
    origin = typeof window !== "undefined" ? window.location.origin : "";
  }

  if (s.startsWith("//")) return `${window?.location?.protocol || "https:"}${s}`;
  if (s.startsWith("/")) return origin ? `${origin}${s}` : s;
  return origin ? `${origin}/${s.replace(/^\//, "")}` : s;
}

function inferKind({ mime, typeField, filename, url }) {
  const t = String(typeField || mime || "").toLowerCase();
  if (t.includes("image")) return ATTACHMENT_KIND.IMAGE;
  if (t.includes("pdf")) return ATTACHMENT_KIND.PDF;
  if (t.includes("audio")) return ATTACHMENT_KIND.AUDIO;
  if (t.includes("text") && !t.includes("application")) return ATTACHMENT_KIND.TEXT;
  if (t === "text" || t === "note" || t === "text_note") return ATTACHMENT_KIND.TEXT;
  if (["image", "photo", "picture"].includes(t)) return ATTACHMENT_KIND.IMAGE;
  if (["pdf", "document", "doc", "file"].includes(t)) {
    const ext = extOf(filename || basenameFromUrl(url));
    if (PDF_EXT.has(ext)) return ATTACHMENT_KIND.PDF;
    return ATTACHMENT_KIND.DOCUMENT;
  }
  if (["audio", "voice", "voice_note", "recording"].includes(t)) return ATTACHMENT_KIND.AUDIO;

  const ext = extOf(filename || basenameFromUrl(url));
  if (IMAGE_EXT.has(ext)) return ATTACHMENT_KIND.IMAGE;
  if (PDF_EXT.has(ext)) return ATTACHMENT_KIND.PDF;
  if (AUDIO_EXT.has(ext)) return ATTACHMENT_KIND.AUDIO;
  if (DOC_EXT.has(ext)) return ATTACHMENT_KIND.DOCUMENT;
  return ATTACHMENT_KIND.OTHER;
}

function pickUploadedBy(row) {
  const u =
    row?.uploaded_by_name ??
    row?.uploaded_by ??
    row?.employee_name ??
    row?.created_by_name ??
    row?.created_by;
  if (u == null || u === "") return "—";
  if (typeof u === "string") return u;
  if (typeof u === "object") {
    const name =
      u.name ??
      (u.first_name && u.last_name ? `${u.first_name} ${u.last_name}`.trim() : null) ??
      u.first_name ??
      u.username;
    return name || "—";
  }
  return String(u);
}

function pickFilename(row, url) {
  const fromFields =
    row?.filename ??
    row?.file_name ??
    row?.name ??
    (typeof row?.image === "string" ? basenameFromUrl(row.image) : null) ??
    (typeof row?.file === "string" ? basenameFromUrl(row.file) : null);
  return fromFields || basenameFromUrl(url) || `Attachment ${row?.id ?? ""}`.trim();
}

function pickTextContent(row, kind) {
  const text =
    row?.text_content ??
    row?.text ??
    row?.content ??
    row?.note ??
    row?.body;
  if (text != null && String(text).trim()) return String(text);
  if (kind === ATTACHMENT_KIND.TEXT && row?.description) return String(row.description);
  return null;
}

export function formatFileSize(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v * 10) / 10} ${units[i]}`;
}

export function formatAttachmentDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function normalizeVisitAttachment(row) {
  if (!row || typeof row !== "object") return null;

  const rawUrl =
    row.file_url ??
    row.url ??
    row.file ??
    row.image ??
    row.thumbnail ??
    row.media_url;
  const url = resolveAttachmentUrl(rawUrl);
  const filename = pickFilename(row, url);
  const mime = row.mime_type ?? row.content_type ?? row.mime;
  const typeField = row.attachment_type ?? row.file_type ?? row.type ?? row.media_type;
  let kind = inferKind({ mime, typeField, filename, url });
  const textContent = pickTextContent(row, kind);
  if (textContent && !url && kind === ATTACHMENT_KIND.OTHER) {
    kind = ATTACHMENT_KIND.TEXT;
  }

  const thumbRaw = row.thumbnail ?? row.thumbnail_url ?? row.preview_url;
  const thumbnailUrl =
    kind === ATTACHMENT_KIND.IMAGE
      ? resolveAttachmentUrl(thumbRaw) || url
      : resolveAttachmentUrl(thumbRaw);
  return {
    id: row.id ?? row.pk ?? `${filename}-${row.timestamp ?? ""}`,
    kind,
    filename,
    url: kind === ATTACHMENT_KIND.TEXT ? null : url,
    thumbnailUrl: kind === ATTACHMENT_KIND.IMAGE ? thumbnailUrl || url : thumbnailUrl,
    fileSize: row.file_size ?? row.size ?? null,
    fileSizeLabel: formatFileSize(row.file_size ?? row.size),
    uploadedAt: row.uploaded_at ?? row.timestamp ?? row.created_at ?? null,
    uploadedAtLabel: formatAttachmentDate(
      row.uploaded_at ?? row.timestamp ?? row.created_at
    ),
    uploadedBy: pickUploadedBy(row),
    description: row.description ?? "",
    textContent,
    mime: mime ?? null,
    raw: row,
  };
}

export function normalizeVisitAttachmentList(payload) {
  if (!Array.isArray(payload)) return [];
  return payload.map(normalizeVisitAttachment).filter(Boolean);
}

/** Attachment count on visit list/detail payloads when API embeds it. */
export function resolveVisitAttachmentCount(visit) {
  if (!visit || typeof visit !== "object") return null;
  const n =
    visit.attachment_count ??
    visit.attachments_count ??
    visit.evidence_count ??
    visit.image_count;
  if (typeof n === "number" && Number.isFinite(n)) return n;
  if (Array.isArray(visit.attachments)) return visit.attachments.length;
  return null;
}
