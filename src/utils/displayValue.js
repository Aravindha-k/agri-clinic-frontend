/**
 * Safe string extraction for nested API objects (crop, village, land, employee, farmer).
 * Prevents "Objects are not valid as a React child" crashes.
 */

export const DISPLAY_FALLBACK = "—";

export function asDisplayString(value, fallback = DISPLAY_FALLBACK) {
  if (value == null || value === "") return fallback;
  if (typeof value === "string") {
    const t = value.trim();
    if (t === "[object Object]") return fallback;
    return t || fallback;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") return resolveNestedName(value, fallback);
  return fallback;
}

export function resolveNestedName(obj, fallback = DISPLAY_FALLBACK) {
  if (obj == null || obj === "") return fallback;
  if (typeof obj === "string" || typeof obj === "number") {
    const s = String(obj);
    return s || fallback;
  }
  if (typeof obj !== "object") return fallback;

  const name =
    obj.name ??
    obj.name_en ??
    obj.name_ta ??
    obj.land_name ??
    obj.field_name ??
    obj.display_name ??
    obj.title ??
    obj.label ??
    obj.username ??
    (obj.first_name
      ? `${obj.first_name}${obj.last_name ? ` ${obj.last_name}` : ""}`.trim()
      : null);

  if (name != null && typeof name === "object") {
    return resolveNestedName(name, fallback);
  }
  return name != null && name !== "" ? String(name) : fallback;
}

export function resolveCropLabel(crop, fallback = DISPLAY_FALLBACK) {
  if (crop == null || crop === "") return fallback;
  if (typeof crop === "string") return crop;
  if (typeof crop === "number") return String(crop);
  if (typeof crop === "object") {
    const label =
      crop.name_en ??
      crop.name ??
      crop.name_ta ??
      crop.crop_name ??
      crop.label;
    return label ? String(label) : fallback;
  }
  return fallback;
}

export function resolveVillageLabel(village, fallback = DISPLAY_FALLBACK) {
  if (village == null || village === "") return fallback;
  if (typeof village === "string") return village;
  if (typeof village === "number") return String(village);
  if (typeof village === "object") {
    const label = village.name ?? village.village_name ?? village.label;
    return label ? String(label) : fallback;
  }
  return fallback;
}

export function resolveDistrictLabel(district, fallback = DISPLAY_FALLBACK) {
  if (district == null || district === "") return fallback;
  if (typeof district === "string") return district;
  if (typeof district === "number") return String(district);
  if (typeof district === "object") {
    const label = district.name ?? district.district_name ?? district.label;
    return label ? String(label) : fallback;
  }
  return fallback;
}

export function resolveLandLabel(land, fallback = DISPLAY_FALLBACK) {
  if (land == null || land === "") return fallback;
  if (typeof land === "string") return land.trim() || fallback;
  if (typeof land === "number" || typeof land === "boolean") {
    return String(land);
  }
  if (typeof land === "object") {
    const name = asDisplayString(
      land.land_name ??
        land.name ??
        land.field_name ??
        land.display_name ??
        land.label,
      ""
    );
    const areaRaw =
      land.land_area ?? land.land_size ?? land.area ?? land.acreage ?? land.size;
    const area =
      areaRaw != null && areaRaw !== ""
        ? asDisplayString(areaRaw, "")
        : "";

    if (name && name !== DISPLAY_FALLBACK && area && area !== DISPLAY_FALLBACK) {
      return `${name} · ${area} ac`;
    }
    if (name && name !== DISPLAY_FALLBACK) return name;
    if (area && area !== DISPLAY_FALLBACK) return `${area} ac`;
    return fallback;
  }
  return fallback;
}

export function resolveEmployeeLabel(employee, fallback = DISPLAY_FALLBACK) {
  if (employee == null || employee === "") return fallback;
  if (typeof employee === "string") return employee;
  if (typeof employee === "number") return String(employee);
  if (typeof employee === "object") {
    const label =
      employee.name ??
      employee.employee_name ??
      (employee.first_name
        ? `${employee.first_name}${employee.last_name ? ` ${employee.last_name}` : ""}`.trim()
        : null) ??
      employee.username;
    return label ? String(label) : fallback;
  }
  return fallback;
}

export function resolveFarmerLabel(farmer, fallback = DISPLAY_FALLBACK) {
  if (farmer == null || farmer === "") return fallback;
  if (typeof farmer === "string") return farmer;
  if (typeof farmer === "number") return String(farmer);
  if (typeof farmer === "object") {
    const label = farmer.name ?? farmer.farmer_name ?? farmer.full_name;
    return label ? String(label) : fallback;
  }
  return fallback;
}
