import api from "./axios";
import {
  resolveList,
  unwrapSuccessEnvelope,
  resolvePaginated,
  fetchAllPaginated,
} from "../utils/apiUnwrap";
import { logApiDiagnostics } from "../utils/apiDiagnostics";

/* ── Generic CRUD helper ── */
const crud = (base) => ({
    list: () => api.get(`${base}/`),
    create: (data) => api.post(`${base}/`, data),
    update: (id, data) => api.put(`${base}/${id}/`, data),
    patch: (id, data) => api.patch(`${base}/${id}/`, data),
    remove: (id) => api.delete(`${base}/${id}/`),
});

async function fetchMasterPage(base, params = {}) {
  const clean = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "" && v !== null && v !== undefined) clean[k] = v;
  });
  const response = await api.get(`${base}/`, { params: clean });
  const page = resolvePaginated(response);
  logApiDiagnostics({
    label: base,
    url: `/api/v1/${base}/`,
    apiCount: page.count,
    rowsLoaded: page.results.length,
    pagination: { page: clean.page, page_size: clean.page_size, next: Boolean(page.next) },
  });
  return page;
}

/** All districts — follows pagination until exhausted */
export async function fetchAllDistricts(params = {}) {
  return fetchAllPaginated(
    (p) => fetchMasterPage("masters/districts", p),
    { page_size: 500, ...params }
  );
}

/** All villages — follows pagination until exhausted */
export async function fetchAllVillages(params = {}) {
  return fetchAllPaginated(
    (p) => fetchMasterPage("masters/villages", p),
    { page_size: 500, ...params }
  );
}

/** All crops from masters — follows pagination until exhausted */
export async function fetchAllMasterCrops(params = {}) {
  return fetchAllPaginated(
    (p) => fetchMasterPage("masters/crops", p),
    { page_size: 500, ...params }
  );
}

/* Districts */
const districtApi = crud("masters/districts");
export const getDistricts = districtApi.list;
export const createDistrict = districtApi.create;
export const updateDistrict = districtApi.update;
export const deleteDistrict = districtApi.remove;

/* Villages */
const villageApi = crud("masters/villages");
export const getVillages = villageApi.list;
export const createVillage = villageApi.create;
export const updateVillage = villageApi.update;
export const deleteVillage = villageApi.remove;

/* Crops */
const cropApi = crud("masters/crops");
export const getCrops = cropApi.list;
export const createCrop = cropApi.create;
export const updateCrop = cropApi.update;
export const deleteCrop = cropApi.remove;

/* Problem Categories */
const problemCatApi = crud("masters/problem-categories");
export const getProblemCategories = problemCatApi.list;
export const createProblemCategory = problemCatApi.create;
export const updateProblemCategory = problemCatApi.update;
export const deleteProblemCategory = (categoryId) => api.delete(`masters/problem-categories/${categoryId}/`);

/** Unwrapped list from problem-categories envelope */
export async function fetchProblemCategories() {
  const res = await getProblemCategories();
  const body = unwrapSuccessEnvelope(res) ?? res?.data;
  return resolveList(body);
}

/* Problem masters (pest / disease / nutrient items) — optional backend route */
const PROBLEM_MASTER_BASE = "masters/problem-masters";

export async function fetchProblemMasters(params = {}) {
  try {
    const page = await fetchMasterPage(PROBLEM_MASTER_BASE, params);
    return {
      items: page.results,
      count: page.count,
      next: page.next,
      apiAvailable: true,
    };
  } catch (err) {
    if (err?.response?.status === 404) {
      return { items: [], count: 0, apiAvailable: false };
    }
    throw err;
  }
}

/** All problem masters across pages */
export async function fetchAllProblemMasters(params = {}) {
  try {
    const merged = await fetchAllPaginated(
      (p) => fetchMasterPage(PROBLEM_MASTER_BASE, { ...params, ...p }),
      { page_size: 200, ...params }
    );
    logApiDiagnostics({
      label: "problem-masters-all",
      url: `/api/v1/${PROBLEM_MASTER_BASE}/`,
      apiCount: merged.count,
      rowsLoaded: merged.results.length,
      pagination: { pagesLoaded: merged.pagesLoaded },
    });
    return {
      items: merged.results,
      count: merged.count,
      apiAvailable: true,
      pagesLoaded: merged.pagesLoaded,
    };
  } catch (err) {
    if (err?.response?.status === 404) {
      return { items: [], count: 0, apiAvailable: false };
    }
    throw err;
  }
}

export async function createProblemMaster(data) {
  const res = await api.post(`${PROBLEM_MASTER_BASE}/`, data);
  return unwrapSuccessEnvelope(res) ?? res?.data;
}

export async function updateProblemMaster(id, data) {
  const res = await api.patch(`${PROBLEM_MASTER_BASE}/${id}/`, data);
  return unwrapSuccessEnvelope(res) ?? res?.data;
}

export async function deleteProblemMaster(id) {
  await api.delete(`${PROBLEM_MASTER_BASE}/${id}/`);
}

export async function probeProblemMastersApi() {
  try {
    await api.get(`${PROBLEM_MASTER_BASE}/`, { params: { page_size: 1 } });
    return true;
  } catch (err) {
    return err?.response?.status !== 404;
  }
}

/** POST masters/problem-masters/import/ — multipart Excel (.xlsx, .xls, .csv) */
export async function importProblemMastersExcel(file, options = {}) {
  const formData = new FormData();
  formData.append("file", file);
  if (options.category_id) formData.append("category_id", String(options.category_id));
  if (options.crop_id) formData.append("crop_id", String(options.crop_id));

  const response = await api.post(`${PROBLEM_MASTER_BASE}/import/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: options.onUploadProgress,
  });
  return response;
}

/* Farmers (masters) */
const farmerApi = crud("masters/farmers");
export const getMasterFarmers = farmerApi.list;
export const getFarmers = farmerApi.list;
export const createFarmer = farmerApi.create;
export const updateFarmer = farmerApi.update;
export const patchFarmer = farmerApi.patch;

/* Lands */
const landApi = crud("masters/lands");
export const getLands = landApi.list;
export const createLand = landApi.create;

/* Field Crops */
const fieldCropApi = crud("masters/field-crops");
export const getFieldCrops = fieldCropApi.list;
export const createFieldCrop = fieldCropApi.create;
