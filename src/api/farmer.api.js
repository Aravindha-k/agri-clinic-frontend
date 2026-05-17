import api from "./axios";
import { unwrapSuccessEnvelope, resolvePaginated, fetchAllPaginated, getResponseBody } from "../utils/apiUnwrap";

const TAG = "[farmer.api]";
const BASE = "farmers";

/** Single page — GET /farmers/?page=&page_size= */
export async function getFarmers(params = {}) {
  const clean = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "" && v !== null && v !== undefined) clean[k] = v;
  });
  const response = await api.get(`${BASE}/`, { params: clean });
  const page = resolvePaginated(response);

  if (import.meta.env?.DEV) {
    const body = getResponseBody(response);
    console.log("[admin] farmers API page", {
      page: clean.page ?? 1,
      count: body?.data?.count ?? body?.count ?? page.count,
      resultsLen: body?.data?.results?.length ?? body?.results?.length ?? page.results.length,
      next: !!(body?.data?.next ?? body?.next),
    });
  }

  return page;
}

/** All farmers across pages (follows `next` until exhausted). */
export async function fetchAllFarmers(params = {}) {
  const merged = await fetchAllPaginated(getFarmers, {
    page_size: 100,
    ...params,
  });

  if (import.meta.env?.DEV) {
    console.log("[admin] farmers loaded", {
      apiCount: merged.count,
      loaded: merged.results.length,
      pages: merged.pagesLoaded,
    });
    if (merged.results[0]) {
      const f = merged.results[0];
      console.log("[admin] farmers list first row", {
        farmer_id: f.id,
        farmer_name: f.name,
        visit_count: f.visit_count ?? f.visits ?? f.total_visits ?? 0,
      });
    }
  }

  return merged;
}

export const getFarmerDetail = async (id) => {
  const response = await api.get(`${BASE}/${id}/`);
  return unwrapSuccessEnvelope(response) ?? {};
};

export const createFarmer = async (data) => {
  const response = await api.post(`${BASE}/`, data);
  return unwrapSuccessEnvelope(response) ?? {};
};

export const updateFarmer = async (id, data) => {
  const response = await api.put(`${BASE}/${id}/`, data);
  return unwrapSuccessEnvelope(response) ?? {};
};

export const deleteFarmer = async (id) => {
  const response = await api.delete(`${BASE}/${id}/`);
  return unwrapSuccessEnvelope(response) ?? {};
};

export const getFarmerFields = async (id) => {
  const response = await api.get(`${BASE}/${id}/fields/`);
  return unwrapSuccessEnvelope(response) ?? {};
};

export const getFarmerVisits = async (id) => {
  const response = await api.get(`${BASE}/${id}/visits/`);
  const page = resolvePaginated(response);
  return page.results;
};

export const getFarmerStats = async () => {
  try {
    const response = await api.get(`${BASE}/stats/`);
    return unwrapSuccessEnvelope(response) ?? {};
  } catch (err) {
    if (err?.response?.status === 404) {
      const page = await fetchAllFarmers();
      const list = page.results ?? [];
      return {
        total: page.count ?? list.length,
        active: list.length,
        districts: new Set(list.map((f) => f.district_name || f.district).filter(Boolean)).size,
        villages: new Set(list.map((f) => f.village_name || f.village).filter(Boolean)).size,
      };
    }
    console.error(TAG, "getFarmerStats failed:", err.response?.status, err.message);
    throw err;
  }
};

export const getFarmerActivity = async (id, params = {}) => {
  const clean = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "" && v !== null && v !== undefined) clean[k] = v;
  });
  const response = await api.get(`${BASE}/${id}/activity/`, { params: clean });
  return unwrapSuccessEnvelope(response) ?? resolvePaginated(response).results;
};
