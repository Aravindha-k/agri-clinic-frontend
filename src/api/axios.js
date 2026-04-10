import axios from "axios";

const baseURL = "https://agri-clinic-backend.onrender.com/api/v1/";

const instance = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Extract the actual records array (or object) from any backend envelope.
 * Handles:  { data: [...] }  |  { results: [...] }  |  plain array  |  plain object
 */
export function unwrapResponse(raw) {
  if (raw == null) return raw;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object") {
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.results)) return raw.results;
    if (Array.isArray(raw.items)) return raw.items;
    // For non-array payloads (e.g. settings object, stats), prefer .data wrapper
    if (raw.data !== undefined) return raw.data;
  }
  return raw;
}

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      const isLoginRequest = error?.config?.url?.includes("/auth/login");
      if (!isLoginRequest) {
        console.warn("Session expired — redirecting to login.");
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        window.location.href = "/login";
      }
    } else if (status !== 403) {
      // Only log unexpected errors; 403 is handled by callers
      console.error("API error:", status, error?.message);
    }
    return Promise.reject(error);
  }
);

export default instance;