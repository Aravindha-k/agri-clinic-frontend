/** User-friendly messages — never expose raw API dumps in the UI. */
import { normalizeAdminApiError } from "./apiErrorNormalize";

export function friendlyErrorMessage(
  err,
  fallback = "We couldn't load this right now. Please try again."
) {
  return normalizeAdminApiError(err, fallback);
}
