import api from "./axios";
import {
  resolvePaginated,
  resolveList,
  unwrapSuccessEnvelope,
  getResponseBody,
  fetchAllPaginated,
} from "../utils/apiUnwrap";
import { isUnreachableError, backendUnavailableMessage } from "../utils/apiBackoff";

const TAG = "[issue.api]";

function cleanParams(params = {}) {
  const clean = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "" && v !== null && v !== undefined) clean[k] = v;
  });
  return clean;
}

function formatApiError(err, label) {
  if (isUnreachableError(err)) {
    return new Error(backendUnavailableMessage());
  }
  const detail =
    err?.response?.data?.detail ||
    err?.response?.data?.message ||
    err?.message ||
    label;
  return new Error(typeof detail === "string" ? detail : label);
}

function parseListResponse(response) {
  const page = resolvePaginated(response);
  if (Array.isArray(page.results) && page.results.length > 0) {
    return page;
  }

  const list = resolveList(response);
  if (list.length > 0) {
    const body = getResponseBody(response);
    const unwrapped = unwrapSuccessEnvelope(response) ?? body;
    const count =
      (typeof unwrapped === "object" && unwrapped?.count) ??
      (typeof body === "object" && body?.count) ??
      list.length;
    return {
      results: list,
      count: typeof count === "number" ? count : list.length,
      next: null,
      previous: null,
    };
  }

  return page;
}

function shouldTryNextPath(err) {
  const status = err?.response?.status;
  return status === 404 || status === 403 || status === 405;
}

/** GET crop issues — prefers /issues/ (mobile/global list), then admin routes */
export const getIssues = async (params = {}) => {
  const clean = cleanParams({ page_size: 200, ...params });
  const paths = ["issues/", "admin/issues/", "admin/crop-issues/"];
  let lastErr;
  let lastEmpty = null;

  for (const path of paths) {
    try {
      const response = await api.get(path, { params: clean });
      const page = parseListResponse(response);
      if (import.meta.env?.DEV) {
        console.info(TAG, `getIssues(${path})`, {
          count: page.count,
          resultsLen: page.results?.length ?? 0,
        });
      }
      if (page.results?.length > 0 || (page.count ?? 0) > 0) {
        return page;
      }
      lastEmpty = page;
    } catch (err) {
      lastErr = err;
      if (shouldTryNextPath(err)) {
        if (import.meta.env?.DEV) {
          console.warn(TAG, `getIssues(${path}) skipped:`, err.response?.status);
        }
        continue;
      }
      console.error(TAG, `getIssues(${path}) failed:`, err.response?.status, err.message);
      throw formatApiError(err, "Failed to load crop issues");
    }
  }

  if (lastEmpty) return lastEmpty;

  console.error(TAG, "getIssues failed:", lastErr?.response?.status, lastErr?.message);
  throw formatApiError(lastErr, "Failed to load crop issues");
};

/** Load all issue pages when list is paginated */
export async function fetchAllIssues(params = {}) {
  return fetchAllPaginated(
    (p) => getIssues(p),
    { page_size: 100, ...params }
  );
}

export const getIssueDetail = async (id) => {
  const paths = [`admin/issues/${id}/`, `issues/${id}/`];
  let lastErr;
  for (const path of paths) {
    try {
      const response = await api.get(path);
      return unwrapSuccessEnvelope(response) ?? response.data;
    } catch (err) {
      lastErr = err;
      if (shouldTryNextPath(err)) continue;
      throw formatApiError(err, "Failed to load issue");
    }
  }
  throw formatApiError(lastErr, "Failed to load issue");
};

export const updateIssue = async (id, data) => {
  try {
    const response = await api.put(`admin/issues/${id}/`, data);
    return unwrapSuccessEnvelope(response) ?? response.data;
  } catch (err) {
    console.error(TAG, `updateIssue(${id}) failed:`, err.response?.status, err.message);
    throw formatApiError(err, "Failed to update issue");
  }
};

export const addRecommendation = async (issueId, data) => {
  try {
    const response = await api.post(`issues/${issueId}/recommend/`, data);
    return unwrapSuccessEnvelope(response) ?? response.data;
  } catch (err) {
    console.error(TAG, `addRecommendation(${issueId}) failed:`, err.response?.status, err.message);
    throw formatApiError(err, "Failed to save recommendation");
  }
};

function flattenRecommendationsFromIssues(issues) {
  const recs = [];
  for (const issue of issues) {
    const nested = issue?.recommendations;
    if (!Array.isArray(nested)) continue;
    for (const rec of nested) {
      recs.push({
        ...rec,
        issue: rec?.issue ?? issue.id,
        issue_id: rec?.issue_id ?? issue.id,
        farmer_name: issue?.farmer_name ?? issue?.farmer?.name,
        crop_name: issue?.crop_name ?? issue?.crop?.name_en ?? issue?.crop?.name,
        problem_category: issue?.issue_title ?? issue?.problem_category,
      });
    }
  }
  return recs;
}

/** GET recommendations — admin list, with fallback from nested issue payloads */
export const getRecommendations = async (params = {}) => {
  const clean = cleanParams(params);
  const paths = ["admin/recommendations/", "recommendations/"];
  let lastErr;
  let lastEmpty = null;

  for (const path of paths) {
    try {
      const response = await api.get(path, { params: clean });
      const page = parseListResponse(response);
      if (import.meta.env?.DEV) {
        console.info(TAG, `getRecommendations(${path})`, {
          count: page.count,
          resultsLen: page.results?.length ?? 0,
        });
      }
      if (page.results?.length > 0 || (page.count ?? 0) > 0) {
        return page;
      }
      lastEmpty = page;
    } catch (err) {
      lastErr = err;
      if (shouldTryNextPath(err)) continue;
      console.error(TAG, `getRecommendations(${path}) failed:`, err.response?.status, err.message);
      throw formatApiError(err, "Failed to load recommendations");
    }
  }

  try {
    const issuesPage = await getIssues({ page_size: 200 });
    const fromIssues = flattenRecommendationsFromIssues(issuesPage.results ?? []);
    if (fromIssues.length > 0) {
      if (import.meta.env?.DEV) {
        console.info(TAG, "getRecommendations fallback from issues", fromIssues.length);
      }
      return {
        results: fromIssues,
        count: fromIssues.length,
        next: null,
        previous: null,
      };
    }
  } catch (err) {
    if (import.meta.env?.DEV) {
      console.warn(TAG, "getRecommendations issues fallback failed", err?.message);
    }
  }

  if (lastEmpty) return lastEmpty;

  throw formatApiError(lastErr, "Failed to load recommendations");
};
