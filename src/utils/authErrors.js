/** Extract structured error fields from API auth responses. */
export function extractAuthError(err) {
  const data = err?.response?.data;
  if (!data) {
    return {
      code: null,
      message: typeof err?.message === "string" ? err.message : "",
      detail: "",
    };
  }

  if (typeof data === "string") {
    return { code: null, message: data, detail: data };
  }

  const code =
    data.code ??
    data.error_code ??
    data.error?.code ??
    data.errors?.code ??
    null;

  const detail =
    (typeof data.detail === "string" && data.detail) ||
    (Array.isArray(data.detail) && data.detail.map((d) => d?.message ?? d).join(" ")) ||
    data.message ||
    data.error?.message ||
    data.errors?.detail ||
    "";

  const message = String(detail || code || err?.message || "").trim();
  return { code: code ? String(code) : null, message, detail: String(detail || "") };
}

export function isAccountLockedError(err) {
  const { code, message, detail } = extractAuthError(err);
  const text = `${code ?? ""} ${message} ${detail}`.toLowerCase();
  return (
    code === "ACCOUNT_LOCKED" ||
    code === "ADMIN_ACCOUNT_LOCKED" ||
    code === "LOCKOUT" ||
    /locked|lockout|too many failed|multiple failed login/i.test(text)
  );
}

export function isPasswordPolicyError(err) {
  const { code, message, detail } = extractAuthError(err);
  const text = `${code ?? ""} ${message} ${detail}`.toLowerCase();
  return (
    code === "PASSWORD_POLICY" ||
    code === "PASSWORD_VALIDATION_FAILED" ||
    /password policy|password must|password requirements|password too weak|password validation/i.test(
      text
    )
  );
}

/** User-facing login failure messages. */
export function loginAuthErrorMessage(err, fallback = "Invalid username or password. Please check and try again.") {
  if (!err) return fallback;

  if (isAccountLockedError(err)) {
    return "This account is temporarily locked due to multiple failed login attempts. Try again later.";
  }

  const { code, message, detail } = extractAuthError(err);

  if (code === "ADMIN_SESSION_EXPIRED") {
    return "Your admin session expired due to inactivity. Please sign in again.";
  }

  if (isPasswordPolicyError(err)) {
    const readable = detail || message;
    if (readable && readable.length <= 200) return readable;
    return "Password does not meet security requirements. Please choose a stronger password.";
  }

  if (message && message.length <= 200 && message !== "[object Object]") {
    if (/invalid username|invalid password|credentials|authentication failed/i.test(message)) {
      return fallback;
    }
    return message;
  }

  return fallback;
}

export const ADMIN_SESSION_EXPIRED_MESSAGE =
  "Your admin session expired due to inactivity. Please sign in again.";

export function isAdminSessionExpiredError(error) {
  const status = error?.response?.status;
  const { code, message, detail } = extractAuthError(error);
  const text = `${code ?? ""} ${message} ${detail}`.toUpperCase();
  return (
    code === "ADMIN_SESSION_EXPIRED" ||
    text.includes("ADMIN_SESSION_EXPIRED") ||
    (status === 401 && /inactiv|session expired|admin session/i.test(`${message} ${detail}`))
  );
}
