import axios from "axios";
import { isAdminSessionExpiredError } from "../utils/authErrors";
import { getApiV1BaseURL } from "../config/api";
import { getAccessToken } from "../utils/authTokens";
import {
  handleFailedRefresh,
  isAuthRefreshExempt,
  redirectToLoginOnce,
  refreshSessionOnce,
} from "../utils/authRefresh";

const baseURL = getApiV1BaseURL(import.meta.env.VITE_API_BASE_URL);

const instance = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,
});

if (import.meta.env.DEV) {
  console.info("[api] baseURL =", baseURL);
}

instance.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * @deprecated Use unwrapSuccessEnvelope / getResponseBody from utils/apiUnwrap.js
 */
export function unwrapResponse(raw) {
  if (raw == null) return raw;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object") {
    if (raw.success === true && raw.data !== undefined) return raw.data;
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.results)) return raw.results;
    if (Array.isArray(raw.items)) return raw.items;
    if (raw.data !== undefined) return raw.data;
  }
  return raw;
}

/** Shared refresh used by interceptor and AuthContext. */
export function refreshSession() {
  return refreshSessionOnce((url, body, config) => instance.post(url, body, config));
}

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const config = error?.config || {};
    const url = config.url ?? config.baseURL ?? "unknown";

    if (!error.response) {
      console.error(
        import.meta.env.PROD
          ? "[api] Network error — check API URL and CORS:"
          : "[api] Network error — is Django running?",
        baseURL,
        url,
        error.message
      );
      return Promise.reject(error);
    }

    const requestId =
      error.response.headers?.["x-request-id"] ||
      error.response.headers?.["x-correlation-id"] ||
      null;
    if (typeof requestId === "string" && requestId) {
      error.requestId = requestId;
    }

    // 403 is authorization/business denial — never refresh, never logout.
    if (status === 403) {
      return Promise.reject(error);
    }

    if (status === 401 && !isAuthRefreshExempt(config) && !config._retry) {
      config._retry = true;
      try {
        const access = await refreshSession();
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${access}`;
        // Replay once. 401 means JWT auth rejected before the view ran,
        // so POST/PUT/PATCH/DELETE are not duplicated by this retry.
        return instance(config);
      } catch (refreshErr) {
        if (refreshErr?.networkRefreshFailed) {
          return Promise.reject(refreshErr);
        }
        handleFailedRefresh(refreshErr);
        return Promise.reject(refreshErr);
      }
    }

    if (status === 401 && config._retry) {
      redirectToLoginOnce({
        sessionExpired: isAdminSessionExpiredError(error),
      });
      return Promise.reject(error);
    }

    if (status !== 403) {
      console.error("[api] HTTP", status, url, error?.response?.data ?? error.message);
    }

    return Promise.reject(error);
  }
);

export default instance;
