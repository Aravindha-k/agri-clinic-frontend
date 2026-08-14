/**
 * Frontend error reporting plug points (no vendor SDK in this pass).
 * Safe metadata only — never attach tokens, passwords, or PII payloads.
 *
 * Future: replace `emit` body with Sentry.captureException / equivalent.
 */

const RELEASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_SHA) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_DEPLOY_SHA) ||
  null;

const SENSITIVE_TEXT =
  /(bearer\s+[\w.-]+)|(eyJ[\w-]+\.[\w-]+\.[\w-]+)|(refresh[_-]?token)|(access[_-]?token)|(temporary[_-]?password)|(password\s*[:=])/gi;

const DROP_EXTRA_KEY =
  /password|token|refresh|authorization|secret|cookie|payload|body|farmer|phone|jwt/i;

function redact(text) {
  return String(text || "")
    .replace(SENSITIVE_TEXT, "[redacted]")
    .slice(0, 500);
}

function sanitizeMessage(err) {
  if (!err) return "Unknown error";
  if (typeof err === "string") return redact(err);
  return redact(err?.message || err?.name || "Error");
}

function sanitizeExtra(extra = {}) {
  if (!extra || typeof extra !== "object") return {};
  const out = {};
  for (const [key, value] of Object.entries(extra)) {
    if (key === "requestId" || key === "request_id") {
      if (typeof value === "string" && value.trim()) {
        out.requestId = value.trim().slice(0, 128);
      }
      continue;
    }
    if (DROP_EXTRA_KEY.test(key)) continue;
    if (value == null || typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    } else if (typeof value === "string") {
      out[key] = redact(value).slice(0, 200);
    } else {
      out[key] = redact(String(value)).slice(0, 200);
    }
  }
  return out;
}

/** Preserve a server request/correlation id only when the response actually sent one. */
export function requestIdFromAxiosError(error) {
  if (typeof error?.requestId === "string" && error.requestId.trim()) {
    return error.requestId.trim().slice(0, 128);
  }
  const headers = error?.response?.headers;
  if (!headers || typeof headers !== "object") return null;
  const raw =
    headers["x-request-id"] ||
    headers["x-correlation-id"] ||
    headers["x-amzn-requestid"] ||
    null;
  if (typeof raw !== "string" || !raw.trim()) return null;
  return raw.trim().slice(0, 128);
}

function buildContext(area = "app", extra = {}) {
  return {
    area: String(area || "app"),
    route: typeof window !== "undefined" ? window.location?.pathname : null,
    release: RELEASE,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent?.slice(0, 180) : null,
    ...sanitizeExtra(extra),
  };
}

function emit(level, err, area, extra) {
  const payload = {
    level,
    name: err?.name || "Error",
    message: sanitizeMessage(err),
    context: buildContext(area, extra),
  };
  // Dev visibility only — production vendor wiring comes later.
  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.warn("[errorReporting]", payload.name, payload.message, payload.context);
  }
  return payload;
}

/** Capture a render/runtime error from an ErrorBoundary or global handler. */
export function captureAppError(err, area = "app", extra = {}) {
  return emit("error", err, area, extra);
}

/** Capture a non-fatal issue (failed lazy chunk, soft widget failure). */
export function captureAppWarning(err, area = "app", extra = {}) {
  return emit("warning", err, area, extra);
}

/**
 * Install once at app root for unhandled errors / rejections.
 * Does not send network payloads; safe for production once a vendor is wired.
 */
export function installGlobalErrorHandlers() {
  if (typeof window === "undefined") return () => {};
  if (window.__kacErrorHandlersInstalled) return () => {};
  window.__kacErrorHandlersInstalled = true;

  const onError = (event) => {
    captureAppError(event?.error || event?.message, "window.onerror");
  };
  const onRejection = (event) => {
    const reason = event?.reason;
    const requestId = requestIdFromAxiosError(reason);
    captureAppError(reason, "unhandledrejection", requestId ? { requestId } : {});
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    window.__kacErrorHandlersInstalled = false;
  };
}
