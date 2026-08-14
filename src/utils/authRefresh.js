/**
 * Single-flight Admin JWT refresh.
 * Does not import AuthContext — axios interceptor is the owner of retry policy.
 */

import {
  persistTokens,
  getRefreshToken,
  clearTokens,
} from "./authTokens";
import { unwrapSuccessEnvelope } from "./apiUnwrap";
import {
  ADMIN_SESSION_EXPIRED_MESSAGE,
  extractAuthError,
  isAdminSessionExpiredError,
} from "./authErrors";

const SESSION_EXPIRED_STORAGE_KEY = "auth_redirect_message";
const SESSION_EXPIRED_REASON = "admin_session_expired";

let refreshInFlight = null;
let loginRedirectStarted = false;

export function isAuthRefreshExempt(config) {
  if (config?.skipAuthRefresh) return true;
  const url = String(config?.url || "");
  return /\/?auth\/(login|refresh|logout)\/?(\?|$)/i.test(url);
}

export function isNetworkOrServerFailure(error) {
  const status = error?.response?.status;
  if (!error?.response) return true;
  return status >= 500;
}

export function isRefreshAuthFailure(error) {
  if (isNetworkOrServerFailure(error)) return false;
  const status = error?.response?.status;
  const { code } = extractAuthError(error);
  const upper = String(code || "").toUpperCase();
  if (status === 401) return true;
  if (
    upper === "TOKEN_NOT_VALID" ||
    upper === "UNAUTHORIZED" ||
    upper === "ACCOUNT_DISABLED" ||
    upper === "ADMIN_SESSION_EXPIRED"
  ) {
    return true;
  }
  return false;
}

export function redirectToLoginOnce({ sessionExpired = false } = {}) {
  if (typeof window === "undefined") return;
  if (loginRedirectStarted) return;
  loginRedirectStarted = true;
  clearTokens();
  if (sessionExpired) {
    try {
      sessionStorage.setItem(SESSION_EXPIRED_STORAGE_KEY, ADMIN_SESSION_EXPIRED_MESSAGE);
    } catch {
      /* ignore */
    }
    window.location.href = `/login?reason=${SESSION_EXPIRED_REASON}`;
    return;
  }
  window.location.href = "/login";
}

/**
 * One shared refresh. Callers must use the same axios instance with skipAuthRefresh.
 * @param {(url: string, body: object, config: object) => Promise<any>} postFn
 */
export function refreshSessionOnce(postFn) {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refresh = getRefreshToken();
    if (!refresh) {
      const err = new Error("No refresh token available");
      err.authFailed = true;
      throw err;
    }

    try {
      const response = await postFn(
        "auth/refresh/",
        { refresh },
        { skipAuthRefresh: true }
      );
      const body = unwrapSuccessEnvelope(response) ?? response?.data;
      const access = body?.access ?? body?.access_token;
      const nextRefresh = body?.refresh ?? body?.refresh_token;
      if (!access) {
        const err = new Error("Refresh response missing access token");
        err.authFailed = true;
        throw err;
      }
      persistTokens({
        access,
        refresh: nextRefresh || undefined,
      });
      return access;
    } catch (err) {
      if (isRefreshAuthFailure(err) || err?.authFailed) {
        err.authFailed = true;
      } else {
        err.networkRefreshFailed = true;
      }
      throw err;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export function handleFailedRefresh(err) {
  if (err?.networkRefreshFailed || (isNetworkOrServerFailure(err) && !err?.authFailed)) {
    return;
  }
  redirectToLoginOnce({
    sessionExpired: isAdminSessionExpiredError(err),
  });
}
