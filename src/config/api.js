/**
 * API URL helpers — all values come from import.meta.env.VITE_API_BASE_URL.
 * Host-only env (http://host:port) is expanded to /api/v1/ for REST clients.
 */

/** @returns {string} */
export function getEnvApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL?.trim() ?? "";
}

/**
 * Axios base URL for /api/v1/* endpoints.
 * @param {string} [raw]
 * @returns {string}
 */
export function getApiV1BaseURL(raw = getEnvApiBaseUrl()) {
  const value = String(raw ?? "").trim();
  if (!value) return "/api/v1/";

  if (value.startsWith("/")) {
    return value.endsWith("/") ? value : `${value}/`;
  }

  const url = new URL(value.endsWith("/") ? value : `${value}/`);
  const path = url.pathname.replace(/\/$/, "");

  if (!path || path === "") {
    return `${url.origin}/api/v1/`;
  }

  if (path.endsWith("/api/v1") || path.includes("/api/v1/")) {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${url.origin}${normalized.endsWith("/") ? normalized : `${normalized}/`}`;
  }

  return `${url.origin}${path.startsWith("/") ? path : `/${path}`}/`;
}

/** Backend origin for media URLs and admin tracking APIs. */
export function getApiOrigin() {
  const v1 = getApiV1BaseURL();
  if (v1.startsWith("http")) {
    return new URL(v1).origin;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

/** Host label for error messages. */
export function getApiHostLabel() {
  const raw = getEnvApiBaseUrl();
  if (!raw) return "API server";
  if (raw.startsWith("/")) {
    return typeof window !== "undefined" ? window.location.origin : "API server";
  }
  try {
    return new URL(raw.endsWith("/") ? raw : `${raw}/`).origin;
  } catch {
    return raw;
  }
}

/** GET /api/admin/tracking/* — outside /api/v1/. */
export function getAdminTrackingBaseURL() {
  const origin = getApiOrigin();
  if (origin) {
    return `${origin}/api/admin/tracking/`;
  }
  return "/api/admin/tracking/";
}

/** Diagnostic log path for a v1 resource. */
export function apiV1Path(resourcePath = "") {
  const base = getApiV1BaseURL();
  const segment = String(resourcePath).replace(/^\//, "");
  if (base.startsWith("http")) {
    return `${base.replace(/\/$/, "")}/${segment}`;
  }
  return `/api/v1/${segment}`;
}
