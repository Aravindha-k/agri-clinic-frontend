/** Display helpers for Problem Items master screen — API-driven, no hardcoded rows. */

const MANAGED_CATEGORY_CODES = new Set([
  "pest",
  "disease",
  "nutrient_deficiency",
  "nutrient_issue",
  "nutrient",
]);

export function isManagedProblemCategory(category) {
  if (!category) return false;
  const code = String(category.code || "").toLowerCase().trim();
  if (MANAGED_CATEGORY_CODES.has(code)) return true;
  if (code === "others" || code.includes("other")) return false;

  const name = String(category.name || "").toLowerCase();
  if (name.includes("other")) return false;
  if (name.includes("pest")) return true;
  if (name.includes("disease")) return true;
  if (name.includes("nutrient")) return true;
  return false;
}

export function filterManagedCategories(categories = []) {
  return categories.filter(isManagedProblemCategory);
}

export function resolveProblemEnglishName(row) {
  return (
    row?.name_en ??
    row?.name ??
    row?.english_name ??
    ""
  );
}

export function resolveProblemTamilName(row) {
  return row?.name_ta ?? row?.tamil_name ?? "";
}

export function resolveProblemCategoryLabel(row) {
  return (
    row?.category_name ??
    row?.category?.name ??
    "—"
  );
}

export function resolveProblemCropLabel(row) {
  if (row?.crop_name) return row.crop_name;
  const crop = row?.crop;
  if (!crop) return "Any crop";
  if (typeof crop === "string") return crop;
  const en = crop.name_en || crop.name;
  const ta = crop.name_ta;
  if (en && ta) return `${en} / ${ta}`;
  return en || "Any crop";
}

export function problemItemMatchesSearch(row, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    resolveProblemEnglishName(row),
    resolveProblemTamilName(row),
    resolveProblemCategoryLabel(row),
    resolveProblemCropLabel(row),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function normalizeProblemImportResult(response) {
  const body = response?.data ?? response ?? {};
  const data = body?.data ?? body;
  const errors = data?.errors ?? data?.row_errors ?? data?.failures ?? [];

  return {
    success: body?.success !== false && (data?.failed ?? 0) === 0 && errors.length === 0,
    created: data?.created ?? data?.created_count ?? data?.imported ?? 0,
    updated: data?.updated ?? data?.updated_count ?? 0,
    skipped: data?.skipped ?? data?.skipped_count ?? 0,
    failed: data?.failed ?? data?.error_count ?? errors.length ?? 0,
    total: data?.total ?? data?.total_rows ?? null,
    errors: Array.isArray(errors) ? errors : [],
    message: body?.message ?? data?.message ?? null,
  };
}
