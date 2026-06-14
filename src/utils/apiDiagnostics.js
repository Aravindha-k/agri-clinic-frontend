/**
 * Temporary dev diagnostics for API count vs rendered rows.
 * Logs in DEV only — remove or gate behind flag when audit is complete.
 */

export function logApiDiagnostics({
  label = "API",
  url = "",
  apiCount = null,
  rowsLoaded = 0,
  rowsRendered = null,
  pagination = null,
  extra = null,
}) {
  if (!import.meta.env?.DEV) return;

  const rendered = rowsRendered ?? rowsLoaded;
  const mismatch =
    typeof apiCount === "number" && apiCount !== rendered && rowsLoaded < apiCount;

  console.info(`[api-audit] ${label}`, {
    url,
    apiCount,
    rowsLoaded,
    rowsRendered: rendered,
    pagination,
    mismatch: mismatch ? "POSSIBLE_TRUNCATION" : false,
    ...extra,
  });
}
