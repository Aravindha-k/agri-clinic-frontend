/**
 * Admin Crop → Pest/Disease mapping — dedicated CropProblem APIs.
 *
 * Do NOT use legacy admin/problem-masters/?crop_id= for mapped lists
 * (global fallback). Create still reuses admin/problem-masters/.
 */
import api from "./axios";
import { unwrapSuccessEnvelope, resolveList } from "../utils/apiUnwrap";
import { logApiDiagnostics } from "../utils/apiDiagnostics";

/** Relative to axios `/api/v1/` base — no second hostname. */
export const CPD_API = {
  LIST: "admin/crop-pest-disease/",
  detail: (cropId) => `admin/crop-pest-disease/${cropId}/`,
  available: (cropId) => `admin/crop-pest-disease/${cropId}/available-masters/`,
  map: (cropId) => `admin/crop-pest-disease/${cropId}/map/`,
  unmap: (cropId) => `admin/crop-pest-disease/${cropId}/unmap/`,
  CREATE_MASTER: "admin/problem-masters/",
};

const BASE = "admin/crop-pest-disease";
const ADMIN_PROBLEM_MASTERS = "admin/problem-masters";

function cleanParams(params = {}) {
  const clean = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "" && v !== null && v !== undefined) clean[k] = v;
  });
  return clean;
}

function toPositiveInt(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error("Expected a positive integer id");
  }
  return n;
}

/** GET /api/v1/admin/crop-pest-disease/ */
export async function getCropPestDiseaseList(params = {}) {
  const clean = cleanParams(params);
  const response = await api.get(`${BASE}/`, { params: clean });
  const data = unwrapSuccessEnvelope(response) ?? response?.data ?? {};
  const results = resolveList(data);
  const count =
    typeof data.count === "number"
      ? data.count
      : typeof response?.data?.count === "number"
        ? response.data.count
        : results.length;
  logApiDiagnostics({
    label: "admin/crop-pest-disease",
    url: "/api/v1/admin/crop-pest-disease/",
    apiCount: count,
    rowsLoaded: results.length,
    pagination: { search: clean.search || null, is_active: clean.is_active ?? null },
  });
  return { count, results, raw: data };
}

/** GET /api/v1/admin/crop-pest-disease/<crop_id>/ */
export async function getCropPestDiseaseDetail(cropId) {
  const id = toPositiveInt(cropId);
  const response = await api.get(`${BASE}/${id}/`);
  const data = unwrapSuccessEnvelope(response) ?? response?.data ?? {};
  logApiDiagnostics({
    label: "admin/crop-pest-disease/detail",
    url: `/api/v1/admin/crop-pest-disease/${id}/`,
    apiCount: (data.pest_count ?? 0) + (data.disease_count ?? 0),
    rowsLoaded: (data.pests?.length ?? 0) + (data.diseases?.length ?? 0),
  });
  return data;
}

/**
 * GET /api/v1/admin/crop-pest-disease/<crop_id>/available-masters/
 * @param {string} category - "pest" | "disease"
 */
export async function searchAvailableMasters(cropId, { category, search, includeMapped = false, limit } = {}) {
  const id = toPositiveInt(cropId);
  const params = cleanParams({
    category,
    search,
    include_mapped: includeMapped ? "true" : "false",
    limit,
  });
  const response = await api.get(`${BASE}/${id}/available-masters/`, { params });
  const data = unwrapSuccessEnvelope(response) ?? response?.data ?? {};
  const results = resolveList(data);
  return {
    crop_id: data.crop_id ?? id,
    category: data.category ?? category,
    count: typeof data.count === "number" ? data.count : results.length,
    results,
  };
}

/** POST /api/v1/admin/crop-pest-disease/<crop_id>/map/ */
export async function mapProblemMaster(cropId, problemMasterId) {
  const id = toPositiveInt(cropId);
  const problem_master_id = toPositiveInt(problemMasterId);
  const response = await api.post(`${BASE}/${id}/map/`, { problem_master_id });
  return unwrapSuccessEnvelope(response) ?? response?.data ?? {};
}

/** POST /api/v1/admin/crop-pest-disease/<crop_id>/unmap/ */
export async function unmapProblemMaster(cropId, problemMasterId) {
  const id = toPositiveInt(cropId);
  const problem_master_id = toPositiveInt(problemMasterId);
  const response = await api.post(`${BASE}/${id}/unmap/`, { problem_master_id });
  return unwrapSuccessEnvelope(response) ?? response?.data ?? {};
}

/**
 * POST /api/v1/admin/problem-masters/
 * Creates Pest/Disease master — does not activate Disease category.
 */
export async function createAdminProblemMaster(payload) {
  const response = await api.post(`${ADMIN_PROBLEM_MASTERS}/`, payload);
  return unwrapSuccessEnvelope(response) ?? response?.data ?? {};
}
