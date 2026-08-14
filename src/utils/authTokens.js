/**
 * Centralized Admin JWT storage (localStorage).
 * Interceptor and AuthContext must use these helpers so rotated refresh is shared.
 */

const ACCESS_KEY = "access";
const REFRESH_KEY = "refresh";

const listeners = new Set();

function notify() {
  const snapshot = {
    access: getAccessToken(),
    refresh: getRefreshToken(),
  };
  listeners.forEach((fn) => {
    try {
      fn(snapshot);
    } catch {
      /* ignore listener errors */
    }
  });
}

export function getAccessToken() {
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

/** Persist access and/or rotated refresh. Omit a key to leave it unchanged. */
export function persistTokens({ access, refresh } = {}) {
  try {
    if (access) localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  } catch {
    /* storage unavailable */
  }
  notify();
}

export function clearTokens() {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* storage unavailable */
  }
  notify();
}

export function subscribeAuthTokens(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
