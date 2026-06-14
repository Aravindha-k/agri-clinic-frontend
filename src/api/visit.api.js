import api from "./axios";
import {
  unwrapSuccessEnvelope,
  resolvePaginated,
  resolveList,
  fetchAllPaginated,
} from "../utils/apiUnwrap";
import { logApiDiagnostics } from "../utils/apiDiagnostics";
import { normalizeVisitAttachmentList } from "../utils/visitAttachments";
import { normalizeVisitRecord, normalizeVisitList, logVisitFarmerBlock } from "../utils/visitFarmer";
import { isUnreachableError, backendUnavailableMessage } from "../utils/apiBackoff";
import { reverseGeocodeSafe } from "../utils/reverseGeocode";
import { locationFieldsForPayload } from "../utils/visitLocation";

const TAG = "[visit.api]";

const LOCATION_FIELDS = [
  "location_name",
  "locality",
  "district",
  "state",
  "formatted_address",
  "address",
];

const cleanVisitPayload = (data = {}) => {
  const payload = { ...data };
  ["land_area", "latitude", "longitude"].forEach((field) => {
    if (payload[field] === "") payload[field] = null;
  });
  ["next_visit_date", "visit_date", "visit_time"].forEach((field) => {
    if (payload[field] === "") delete payload[field];
  });
  LOCATION_FIELDS.forEach((field) => {
    if (payload[field] === "") delete payload[field];
  });
  if (payload.formatted_address && !payload.address) {
    payload.address = payload.formatted_address;
  }
  delete payload.employee_id;
  delete payload.employee;
  return payload;
};

/** Attach resolved address fields before create/update (non-blocking on failure). */
export async function enrichVisitPayloadWithLocation(payload = {}) {
  const cleaned = cleanVisitPayload(payload);
  const hasCoords = cleaned.latitude != null && cleaned.longitude != null;
  const hasAddress = Boolean(cleaned.formatted_address || cleaned.address);
  if (!hasCoords || hasAddress) return cleaned;

  const resolved = await reverseGeocodeSafe(cleaned.latitude, cleaned.longitude);
  return cleanVisitPayload({
    ...cleaned,
    ...locationFieldsForPayload(resolved),
  });
}

function formatVisitError(err, label) {
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

// List visits - GET /admin/visits/ (global submitted visits, all employees)
export const getVisits = async (params = {}) => {
  const { status, limit, ...rest } = params;
  const query = {
    ordering: "-created_at",
    page_size: rest.page_size ?? limit ?? 12,
    ...rest,
  };

  try {
    const response = await api.get("admin/visits/", { params: query });
    const page = resolvePaginated(response);
    const records = normalizeVisitList(page.results);
    if (import.meta.env?.DEV && records[0]) {
      logVisitFarmerBlock(records[0]);
    }
    const out = { ...page, results: records };
    logApiDiagnostics({
      label: "admin/visits",
      url: "/api/v1/admin/visits/",
      apiCount: out.count,
      rowsLoaded: records.length,
      pagination: { page: query.page, page_size: query.page_size },
    });
    return out;
  } catch (err) {
    console.error(TAG, "getVisits failed:", err.response?.status, err.message);
    throw formatVisitError(err, "Failed to load visits");
  }
};

/** Fetch all visit pages (reports / exports) */
export async function fetchAllVisits(params = {}) {
  return fetchAllPaginated(getVisits, { page_size: 100, ordering: "-created_at", ...params });
}

// List visit evidence — GET /admin/visits/{id}/attachments/
export const getVisitAttachments = async (visitId) => {
  try {
    const response = await api.get(`admin/visits/${visitId}/attachments/`);
    const list = resolveList(response);
    return normalizeVisitAttachmentList(list);
  } catch (err) {
    console.error(TAG, `getVisitAttachments(${visitId}) failed:`, err.response?.status, err.message);
    throw formatVisitError(err, "Failed to load visit evidence");
  }
};

// Get visit detail - GET /admin/visits/{id}/
export const getVisitDetail = async (id) => {
  try {
    const response = await api.get(`admin/visits/${id}/`);
    const data = unwrapSuccessEnvelope(response) ?? {};
    return normalizeVisitRecord(data && typeof data === "object" ? data : {});
  } catch (err) {
    console.error(TAG, `getVisitDetail(${id}) failed:`, err.response?.status, err.message);
    throw formatVisitError(err, "Failed to load visit");
  }
};

// Create visit - POST /visits/
export const createVisit = async (data) => {
  const response = await api.post("visits/", await enrichVisitPayloadWithLocation(data));
  const raw = unwrapSuccessEnvelope(response) ?? {};
  return normalizeVisitRecord(raw && typeof raw === "object" ? raw : {});
};

// Update visit - PATCH /visits/{id}/
export const updateVisit = async (id, data) => {
  const response = await api.patch(`visits/${id}/`, await enrichVisitPayloadWithLocation(data));
  const raw = unwrapSuccessEnvelope(response) ?? {};
  return normalizeVisitRecord(raw && typeof raw === "object" ? raw : {});
};

// Upload photo - POST /visits/upload-photo/
export const uploadVisitPhoto = async (data) => {
  const response = await api.post("visits/upload-photo/", data);
  return unwrapSuccessEnvelope(response) ?? {};
};

function inferAttachmentType(file) {
  const mime = (file?.type || "").toLowerCase();
  const name = (file?.name || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    mime.includes("word") ||
    mime.includes("document") ||
    name.endsWith(".doc") ||
    name.endsWith(".docx")
  ) {
    return "document";
  }
  return "other";
}

/** POST /visits/{id}/attachments/ — multipart file upload */
export const uploadVisitAttachment = async (visitId, file, options = {}) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "attachment_type",
    options.attachment_type || inferAttachmentType(file)
  );
  if (options.text_content) formData.append("text_content", options.text_content);

  const response = await api.post(`visits/${visitId}/attachments/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrapSuccessEnvelope(response) ?? {};
};

// Start visit - POST /visits/start/
export const startVisit = async (data) => {
  const response = await api.post("visits/start/", data);
  return unwrapSuccessEnvelope(response) ?? {};
};

// Complete visit - POST /visits/{id}/complete/
export const completeVisit = async (id, body = {}) => {
  const response = await api.post(`visits/${id}/complete/`, body);
  return unwrapSuccessEnvelope(response) ?? {};
};
