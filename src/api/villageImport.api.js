import api from "./axios";
import { unwrapSuccessEnvelope } from "../utils/apiUnwrap";

export const VILLAGE_IMPORT_VALIDATE_PATH = "admin/villages/import/validate/";
export const VILLAGE_IMPORT_CONFIRM_PATH = "admin/villages/import/confirm/";
const IMPORT_TIMEOUT_MS = 120000;

/** POST /api/v1/admin/villages/import/validate/ — multipart file=xlsx */
export async function validateVillageImport(file) {
  const form = new FormData();
  form.append("file", file);
  const response = await api.post(VILLAGE_IMPORT_VALIDATE_PATH, form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: IMPORT_TIMEOUT_MS,
  });
  return unwrapSuccessEnvelope(response) ?? response.data;
}

/** POST /api/v1/admin/villages/import/confirm/ — { import_token } */
export async function confirmVillageImport(importToken) {
  const response = await api.post(
    VILLAGE_IMPORT_CONFIRM_PATH,
    { import_token: importToken },
    { timeout: IMPORT_TIMEOUT_MS }
  );
  return unwrapSuccessEnvelope(response) ?? response.data;
}
