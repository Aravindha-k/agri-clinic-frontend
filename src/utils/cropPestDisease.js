/**
 * Crop → Pest/Disease mapping presentation helpers.
 * Counts and IDs always come from backend — never invented client-side.
 */

export const CPD_CATEGORY = {
  PEST: "pest",
  DISEASE: "disease",
};

/** Production category PKs (codes remain authoritative for search). */
export const CPD_CATEGORY_ID = {
  PEST: 16,
  DISEASE: 17,
};

export const DISEASE_FIELD_NOTICE =
  "Disease master data is prepared but not yet enabled for field use.";

export const TAMIL_PENDING = "—";

export function toNonNegInt(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function toPositiveIntOrNull(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

/** Display tamil_name from backend exactly; blank → em dash. Never translate. */
export function displayTamilName(raw) {
  if (raw == null) return TAMIL_PENDING;
  const text = String(raw).trim();
  return text ? text : TAMIL_PENDING;
}

export function cropDisplayName(crop) {
  if (!crop || typeof crop !== "object") return "Crop";
  return (
    String(crop.name_en || crop.name || "").trim() ||
    `Crop #${crop.id ?? ""}`
  );
}

export function cropMatchesMappingSearch(crop, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  const en = String(crop?.name_en || crop?.name || "").toLowerCase();
  const ta = String(crop?.name_ta || crop?.tamil_name || "").toLowerCase();
  return en.includes(q) || ta.includes(q);
}

export function normalizeCropPestDiseaseRow(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = toPositiveIntOrNull(raw.id);
  if (id == null) return null;
  return {
    id,
    name_en: String(raw.name_en || raw.name || "").trim(),
    name_ta: String(raw.name_ta || raw.tamil_name || "").trim(),
    tamil_name: String(raw.tamil_name || raw.name_ta || "").trim(),
    is_active: raw.is_active !== false,
    pest_count: toNonNegInt(raw.pest_count),
    disease_count: toNonNegInt(raw.disease_count),
  };
}

export function normalizeCropPestDiseaseList(payload) {
  const data = payload?.results ? payload : payload?.data ?? payload ?? {};
  const results = Array.isArray(data.results)
    ? data.results
    : Array.isArray(data)
      ? data
      : [];
  const rows = results.map(normalizeCropPestDiseaseRow).filter(Boolean);
  return {
    count: typeof data.count === "number" ? data.count : rows.length,
    results: rows,
  };
}

export function normalizeMappedMaster(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = toPositiveIntOrNull(raw.id);
  if (id == null) return null;
  return {
    id,
    name: String(raw.name || raw.name_en || "").trim(),
    tamil_name: String(raw.tamil_name || raw.name_ta || "").trim(),
    is_active: raw.is_active !== false,
    category_id: toPositiveIntOrNull(raw.category_id),
    category_code: String(raw.category_code || "").toLowerCase(),
    already_mapped: Boolean(raw.already_mapped),
  };
}

export function normalizeCropPestDiseaseDetail(payload) {
  const data = payload?.crop ? payload : payload?.data ?? payload ?? {};
  const cropRaw = data.crop || {};
  const cropId = toPositiveIntOrNull(cropRaw.id);
  const pests = (Array.isArray(data.pests) ? data.pests : [])
    .map(normalizeMappedMaster)
    .filter(Boolean);
  const diseases = (Array.isArray(data.diseases) ? data.diseases : [])
    .map(normalizeMappedMaster)
    .filter(Boolean);
  return {
    crop: {
      id: cropId,
      name_en: String(cropRaw.name_en || cropRaw.name || "").trim(),
      name_ta: String(cropRaw.name_ta || cropRaw.tamil_name || "").trim(),
      tamil_name: String(cropRaw.tamil_name || cropRaw.name_ta || "").trim(),
      is_active: cropRaw.is_active !== false,
    },
    pests,
    diseases,
    pest_count:
      typeof data.pest_count === "number" ? toNonNegInt(data.pest_count) : pests.length,
    disease_count:
      typeof data.disease_count === "number"
        ? toNonNegInt(data.disease_count)
        : diseases.length,
  };
}

export function normalizeAvailableMasters(payload) {
  const data = payload?.results ? payload : payload?.data ?? payload ?? {};
  const results = (Array.isArray(data.results) ? data.results : [])
    .map(normalizeMappedMaster)
    .filter(Boolean);
  return {
    crop_id: toPositiveIntOrNull(data.crop_id),
    category: String(data.category || "").toLowerCase(),
    count: typeof data.count === "number" ? data.count : results.length,
    results,
  };
}

export function filterMappedMasters(items, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return Array.isArray(items) ? items : [];
  return (items || []).filter((item) => {
    const en = String(item?.name || "").toLowerCase();
    const ta = String(item?.tamil_name || "").toLowerCase();
    return en.includes(q) || ta.includes(q);
  });
}

export function resolveCategoryId(categories, code, fallbackId) {
  const wanted = String(code || "").toLowerCase();
  const list = Array.isArray(categories) ? categories : [];
  const hit = list.find((c) => String(c.code || "").toLowerCase() === wanted);
  const fromList = toPositiveIntOrNull(hit?.id);
  if (fromList != null) return fromList;
  return toPositiveIntOrNull(fallbackId);
}

export function extractCreatedMasterId(payload) {
  if (payload == null) return null;
  if (typeof payload === "number") return toPositiveIntOrNull(payload);
  const candidates = [
    payload.id,
    payload.pk,
    payload.problem_master_id,
    payload.data?.id,
    payload.data?.pk,
  ];
  for (const c of candidates) {
    const id = toPositiveIntOrNull(c);
    if (id != null) return id;
  }
  return null;
}

export function unmapConfirmCopy({ masterName, cropName }) {
  const master = String(masterName || "this master").trim() || "this master";
  const crop = String(cropName || "this crop").trim() || "this crop";
  return {
    title: "Remove mapping",
    message: `Remove ${master} from ${crop}?`,
    support:
      "This removes the mapping from this crop only. It does not delete the master or historical visit data.",
  };
}

export function mapSuccessMessage({ masterName, cropName }) {
  const master = String(masterName || "Master").trim() || "Master";
  const crop = String(cropName || "crop").trim() || "crop";
  return `${master} mapped to ${crop}.`;
}

export function unmapSuccessMessage({ masterName, cropName }) {
  const master = String(masterName || "Master").trim() || "Master";
  const crop = String(cropName || "crop").trim() || "crop";
  return `${master} removed from ${crop}.`;
}

export function cropProblemsPath(cropId) {
  const id = toPositiveIntOrNull(cropId);
  if (id == null) return "/masters/crops";
  return `/masters/crops/${id}/problems`;
}
