import axios from "axios";
import {
  ADMIN_SESSION_EXPIRED_MESSAGE,
  isAdminSessionExpiredError,
} from "../utils/authErrors";
import { getApiV1BaseURL } from "../config/api";

const SESSION_EXPIRED_STORAGE_KEY = "auth_redirect_message";
const SESSION_EXPIRED_REASON = "admin_session_expired";

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
  const token = localStorage.getItem("access");
  if (token) {
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

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url ?? error?.config?.baseURL ?? "unknown";

    if (!error.response) {
      console.error(
        import.meta.env.PROD
          ? "[api] Network error — check API URL and CORS:"
          : "[api] Network error — is Django running?",
        baseURL,
        url,
        error.message
      );
    } else if (status === 401 || status === 403) {
      const isLoginRequest = String(url).includes("/auth/login");
      if (!isLoginRequest && (status === 401 || isAdminSessionExpiredError(error))) {
        const expired = isAdminSessionExpiredError(error);
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        if (expired) {
          sessionStorage.setItem(SESSION_EXPIRED_STORAGE_KEY, ADMIN_SESSION_EXPIRED_MESSAGE);
          window.location.href = `/login?reason=${SESSION_EXPIRED_REASON}`;
        } else {
          console.warn("[api] Session expired — redirecting to login.");
          window.location.href = "/login";
        }
      }
    } else if (status !== 403) {
      console.error("[api] HTTP", status, url, error?.response?.data ?? error.message);
    }

    return Promise.reject(error);
  }
);

export default instance;
