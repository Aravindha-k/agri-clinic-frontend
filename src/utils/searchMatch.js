/**
 * Prefix-only search helpers for Admin list/filter UIs.
 * Each field is matched independently from the start — no substring matching.
 */

export function normalizeSearchValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function startsWithSearch(value, query) {
  const q = normalizeSearchValue(query);
  if (!q) return true;
  return normalizeSearchValue(value).startsWith(q);
}

/**
 * True when any supplied field value prefix-matches the query.
 * Arrays are flattened one level (e.g. village names).
 */
export function matchesAnyFieldPrefix(query, fields) {
  const q = normalizeSearchValue(query);
  if (!q) return true;

  const list = Array.isArray(fields) ? fields : [fields];
  return list.some((entry) => {
    if (Array.isArray(entry)) {
      return entry.some((item) => startsWithSearch(item, q));
    }
    if (entry == null || entry === "") return false;
    return startsWithSearch(entry, q);
  });
}

function extractAssignedVillageNames(emp) {
  const profile = emp?.employee_profile ?? emp?.profile ?? emp;
  const summary = emp?.location_assignment_summary;
  const sources = [
    profile?.assigned_villages,
    profile?.villages,
    summary?.assigned_villages,
    summary?.villages,
    profile?.village_names,
    summary?.village_names,
    emp?.assigned_villages,
    emp?.village_names,
  ];

  for (const src of sources) {
    if (Array.isArray(src) && src.length) {
      return src
        .map((v) =>
          typeof v === "object" ? v.name ?? v.village_name ?? v.label : String(v)
        )
        .filter(Boolean);
    }
    if (typeof src === "string" && src.trim()) {
      return src.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

export function buildEmployeeSearchFields(emp) {
  if (!emp) return [];
  const profile = emp?.employee_profile ?? emp?.profile ?? emp;
  const fullName = [emp?.first_name, emp?.last_name].filter(Boolean).join(" ").trim();
  const district =
    emp?.district_name ??
    profile?.district_name ??
    (typeof profile?.district === "object" ? profile?.district?.name : profile?.district);

  return [
    fullName || emp?.username,
    emp?.username,
    emp?.employee_id,
    emp?.employee_code,
    emp?.phone,
    district,
    extractAssignedVillageNames(emp),
  ];
}

export function employeeMatchesPrefixSearch(emp, query) {
  return matchesAnyFieldPrefix(query, buildEmployeeSearchFields(emp));
}

export function farmerMatchesPrefixSearch(farmer, query) {
  if (!farmer) return false;
  return matchesAnyFieldPrefix(query, [
    farmer.name,
    farmer.farmer_name,
    farmer.phone,
    farmer.farmer_code,
    farmer.village_name ?? farmer.village?.name,
    farmer.district_name ?? farmer.district?.name,
    farmer.field_name ?? farmer.land_name,
  ]);
}

export function visitRowMatchesPrefixSearch(row, query) {
  if (!row) return false;
  return matchesAnyFieldPrefix(query, [
    row.farmer_name,
    row.farmer_phone,
    row.employee_name ?? row.employee,
    row.employee_code,
    row.employee_id,
    row.village_name ?? row.village,
    row.district_name ?? row.district,
    row.crop_name ?? row.crop,
    row.id != null ? String(row.id) : null,
  ]);
}

export function cropMatchesPrefixSearch(crop, query) {
  if (!crop) return false;
  return matchesAnyFieldPrefix(query, [
    crop.name_en,
    crop.name,
    crop.crop_name,
    crop.name_ta,
    crop.scientific_name,
    crop.crop_category,
    crop.crop_code ?? crop.code,
  ]);
}

export function problemItemMatchesPrefixSearch(row, query) {
  if (!row) return false;
  return matchesAnyFieldPrefix(query, [
    row.name_en ?? row.name,
    row.name_ta ?? row.tamil_name,
    row.category?.name ?? row.category_name,
    row.crop?.name_en ?? row.crop_name,
    row.code,
  ]);
}
