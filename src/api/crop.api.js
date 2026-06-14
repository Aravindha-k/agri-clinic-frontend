import api from "./axios";
import { resolvePaginated, fetchAllPaginated } from "../utils/apiUnwrap";
import { logApiDiagnostics } from "../utils/apiDiagnostics";

const TAG = "[crop.api]";

/** Single page — GET masters/crops/ */
export async function getCropsPage(params = {}) {
  const clean = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "" && v !== null && v !== undefined) clean[k] = v;
  });
  try {
    const response = await api.get("masters/crops/", { params: clean });
    const page = resolvePaginated(response);
    logApiDiagnostics({
      label: "masters/crops",
      url: "/api/v1/masters/crops/",
      apiCount: page.count,
      rowsLoaded: page.results.length,
      pagination: { page: clean.page, page_size: clean.page_size },
    });
    return page;
  } catch (err) {
    console.error(TAG, "getCropsPage failed:", err.response?.status, err.message);
    throw err;
  }
}

/** @deprecated Use getCropsPage or fetchAllCrops — returns first page results only */
export const getCrops = async (params = {}) => {
  const page = await getCropsPage(params);
  return page.results;
};

/** All active crops for dropdowns and master screens */
export async function fetchAllCrops(params = {}) {
  return fetchAllPaginated(getCropsPage, { page_size: 500, ...params });
}

export const createCrop = async (data) => {
  const response = await api.post("masters/crops/", data);
  return response.data;
};

export const updateCrop = async (id, data) => {
  const response = await api.patch(`masters/crops/${id}/`, data);
  return response.data;
};

export const deleteCrop = async (id) => {
  await api.delete(`masters/crops/${id}/`);
};
