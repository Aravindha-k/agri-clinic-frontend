import { resolveAttachmentUrl } from "./visitAttachments";

/** Resolve profile image URL from API row or nested object. */
export function resolveProfilePhotoUrl(entity) {
  if (!entity || typeof entity !== "object") return null;

  const nested =
    entity.employee_profile ??
    entity.profile ??
    entity.employee ??
    entity.farmer ??
    entity.farmer_info ??
    null;

  const raw =
    entity.profile_photo_url ??
    entity.profilePhotoUrl ??
    entity.profile_photo ??
    entity.photo_url ??
    entity.avatar_url ??
    entity.avatar ??
    entity.image_url ??
    entity.photo ??
    (nested && typeof nested === "object"
      ? nested.profile_photo_url ?? nested.profile_photo ?? nested.photo_url
      : null);

  return resolveAttachmentUrl(raw);
}

/** Display name for initials fallback. */
export function profileDisplayName(entity, fallback = "") {
  if (!entity || typeof entity !== "object") return fallback;
  const parts = [
    entity.name,
    entity.full_name,
    entity.farmer_name,
    entity.first_name && entity.last_name
      ? `${entity.first_name} ${entity.last_name}`.trim()
      : null,
    entity.first_name,
    entity.username,
    entity.employee_name,
    entity.employee_id,
  ].filter(Boolean);
  return String(parts[0] || fallback || "?");
}

/** Up to two initials from a display name. */
export function getProfileInitials(name, fallback = "?") {
  const s = String(name || "").trim();
  if (!s || s === "—") return fallback.slice(0, 2).toUpperCase();
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return s.slice(0, 2).toUpperCase();
}

/** Read cache-buster token from API row. */
export function profilePhotoVersion(entity) {
  if (!entity || typeof entity !== "object") return null;
  return (
    entity.profile_photo_updated_at ??
    entity.profilePhotoUpdatedAt ??
    entity.photo_updated_at ??
    null
  );
}

/** Append ?v= for browser image cache busting after upload. */
export function cacheBustPhotoUrl(url, version) {
  if (!url) return null;
  const token = version ?? Date.now();
  const sep = String(url).includes("?") ? "&" : "?";
  return `${url}${sep}v=${encodeURIComponent(String(token))}`;
}

/** Resolved display URL with cache bust when version known. */
export function resolveProfilePhotoDisplayUrl(entity) {
  const base = resolveProfilePhotoUrl(entity);
  if (!base) return null;
  return cacheBustPhotoUrl(base, profilePhotoVersion(entity));
}

/** Extract profile_photo_url from upload API response. */
export function photoUrlFromUploadResponse(res) {
  const body = res?.data?.data ?? res?.data ?? res;
  const row = body?.employee ?? body?.farmer ?? body;
  const url = resolveProfilePhotoUrl(row) ?? resolveProfilePhotoUrl(body);
  const version = profilePhotoVersion(row) ?? profilePhotoVersion(body);
  return url ? cacheBustPhotoUrl(url, version) : null;
}
