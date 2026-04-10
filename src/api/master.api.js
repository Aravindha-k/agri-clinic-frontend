import api from "./axios";

/* ── Generic CRUD helper ── */
const crud = (base) => ({
    list: () => api.get(`${base}/`),
    create: (data) => api.post(`${base}/`, data),
    update: (id, data) => api.put(`${base}/${id}/`, data),
    patch: (id, data) => api.patch(`${base}/${id}/`, data),
    remove: (id) => api.delete(`${base}/${id}/`),
});

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

/* Farmers (masters) */
const farmerApi = crud("masters/farmers");
export const getMasterFarmers = farmerApi.list;

/* Lands */
const landApi = crud("masters/lands");
export const getLands = landApi.list;
export const createLand = landApi.create;

/* Field Crops */
const fieldCropApi = crud("masters/field-crops");
export const getFieldCrops = fieldCropApi.list;
export const createFieldCrop = fieldCropApi.create;