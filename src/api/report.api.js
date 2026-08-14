import api from "./axios";
import { unwrapSuccessEnvelope } from "../utils/apiUnwrap";

function cleanParams(params = {}) {
  const out = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "" && v != null) out[k] = v;
  });
  return out;
}

/** Legacy unused contract — kept for compatibility. */
export const getReports = () => {
  return api.get("reports/employee-visits/");
};

/**
 * Admin report aggregates — GET /api/v1/reports/summary/
 * Params: from, to, employee, district
 */
export async function getReportSummary(params = {}) {
  const response = await api.get("reports/summary/", { params: cleanParams(params) });
  return unwrapSuccessEnvelope(response) ?? response.data;
}
