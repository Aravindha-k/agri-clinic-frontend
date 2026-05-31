import api from "./axios";
import { unwrapSuccessEnvelope, getResponseBody } from "../utils/apiUnwrap";
import { normalizeAdminSecurity } from "../utils/adminSecurity";

const TAG = "[security.api]";

/** GET /employees/admin/security/ — admin security monitoring */
export async function getAdminSecurity(params = {}) {
  try {
    const response = await api.get("employees/admin/security/", { params });
    const body = unwrapSuccessEnvelope(response) ?? getResponseBody(response) ?? response.data;
    return normalizeAdminSecurity(body);
  } catch (err) {
    console.error(TAG, "getAdminSecurity failed:", err?.response?.status, err?.message);
    throw err;
  }
}
