/**
 * Resolve farmer display fields from visit list/detail payloads.
 * Nested farmer object + flat fields (backend sync).
 */

import {
  DISPLAY_FALLBACK,
  asDisplayString,
  resolveCropLabel,
  resolveVillageLabel,
  resolveDistrictLabel,
  resolveLandLabel,
  resolveFarmerLabel,
  resolveEmployeeLabel,
} from "./displayValue";
import { resolveProfilePhotoUrl } from "./profilePhoto";

function pickString(...candidates) {
  for (const c of candidates) {
    if (c == null || c === "") continue;
    if (typeof c === "string" && c !== DISPLAY_FALLBACK) return c;
    if (typeof c === "number") return String(c);
  }
  return null;
}

export function resolveVisitFarmer(visit) {
  if (!visit || typeof visit !== "object") {
    return {
      name: DISPLAY_FALLBACK,
      phone: DISPLAY_FALLBACK,
      village: DISPLAY_FALLBACK,
      district: DISPLAY_FALLBACK,
      cropName: DISPLAY_FALLBACK,
    };
  }

  const f = visit.farmer ?? visit.farmer_info;
  const crop = visit.crop_info ?? visit.crop;

  const cropName =
    pickString(
      visit.crop_name,
      resolveCropLabel(crop, ""),
      f?.crop_name ? resolveCropLabel(f.crop_name, "") : null
    ) ?? DISPLAY_FALLBACK;

  const village =
    pickString(
      visit.village_name,
      visit.farmer_village,
      resolveVillageLabel(f?.village, ""),
      resolveVillageLabel(visit.village, "")
    ) ?? DISPLAY_FALLBACK;

  const district =
    pickString(
      visit.district_name,
      resolveDistrictLabel(f?.district, ""),
      resolveDistrictLabel(visit.district, ""),
      typeof visit.district === "string" ? visit.district : null
    ) ?? DISPLAY_FALLBACK;

  const name =
    pickString(
      visit.farmer_name,
      resolveFarmerLabel(f, ""),
      f?.name
    ) ?? DISPLAY_FALLBACK;

  const phone =
    pickString(
      visit.farmer_mobile,
      visit.farmer_phone,
      f?.mobile,
      f?.phone
    ) ?? DISPLAY_FALLBACK;

  const profilePhotoUrl =
    resolveProfilePhotoUrl(f) ??
    resolveProfilePhotoUrl(visit) ??
    visit.farmer_profile_photo_url ??
    null;

  return {
    name,
    phone,
    village,
    district,
    cropName,
    profilePhotoUrl,
  };
}

/** Employee photo from visit row (nested employee block or flat fields). */
export function resolveVisitEmployeePhoto(visit) {
  if (!visit || typeof visit !== "object") return null;
  return (
    resolveProfilePhotoUrl(visit.employee) ??
    resolveProfilePhotoUrl(visit) ??
    visit.employee_profile_photo_url ??
    null
  );
}

export function resolveVisitEmployeePhotoVersion(visit) {
  if (!visit || typeof visit !== "object") return null;
  const emp = visit.employee;
  return (
    visit.employee_profile_photo_updated_at ??
    emp?.profile_photo_updated_at ??
    null
  );
}

/** Remove legacy visit workflow fields — admin UI does not use status/pending/completed. */
export function stripVisitWorkflowFields(visit) {
  if (!visit || typeof visit !== "object") return visit;
  const { status, visit_status, ...rest } = visit;
  return rest;
}

/** Flatten farmer fields onto visit row for list/detail UI. */
export function normalizeVisitRecord(visit) {
  if (!visit || typeof visit !== "object") return visit;
  const farmer = resolveVisitFarmer(visit);
  const landObj = visit.land ?? visit.field ?? visit.field_info;
  const landName =
    visit.land_name ??
    (typeof landObj === "object" && landObj
      ? landObj.land_name ?? landObj.name ?? landObj.field_name
      : typeof visit.field === "string"
        ? visit.field
        : undefined);

  return {
    ...stripVisitWorkflowFields(visit),
    farmer_name: farmer.name !== DISPLAY_FALLBACK ? farmer.name : visit.farmer_name,
    farmer_phone:
      farmer.phone !== DISPLAY_FALLBACK ? farmer.phone : visit.farmer_phone ?? visit.farmer_mobile,
    farmer_mobile: visit.farmer_mobile ?? (farmer.phone !== DISPLAY_FALLBACK ? farmer.phone : undefined),
    farmer_village:
      visit.farmer_village ?? (farmer.village !== DISPLAY_FALLBACK ? farmer.village : undefined),
    village_name:
      visit.village_name ?? (farmer.village !== DISPLAY_FALLBACK ? farmer.village : undefined),
    crop_name:
      visit.crop_name ?? (farmer.cropName !== DISPLAY_FALLBACK ? farmer.cropName : undefined),
    land_name: landName,
    employee_name:
      visit.employee_name ??
      (resolveEmployeeLabel(visit.employee, "") || undefined),
  };
}

export function normalizeVisitList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeVisitRecord);
}

function formatVisitDateTime(d) {
  if (!d || Number.isNaN(d.getTime())) return DISPLAY_FALLBACK;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Visit date + optional time; falls back to created_at when visit_date is missing. */
export function visitWhenLabel(v) {
  if (!v) return DISPLAY_FALLBACK;

  if (v.visit_date) {
    const d = new Date(v.visit_date);
    if (Number.isNaN(d.getTime())) return DISPLAY_FALLBACK;
    const datePart = d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    if (v.visit_time) {
      const [h, m] = String(v.visit_time).split(":");
      if (h !== undefined && m !== undefined) {
        return `${datePart} ${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
      }
    }
    return datePart;
  }

  if (v.created_at) {
    return formatVisitDateTime(new Date(v.created_at));
  }

  return DISPLAY_FALLBACK;
}

/** When the visit was recorded (for card headers — same-farmer rows). */
export function visitSubmittedLabel(v) {
  const raw = v?.created_at ?? v?.visit_date;
  if (!raw) return null;
  const label = formatVisitDateTime(new Date(raw));
  return label !== DISPLAY_FALLBACK ? label : null;
}

export function visitLandLabel(v) {
  if (!v || typeof v !== "object") return DISPLAY_FALLBACK;

  const field = v?.field ?? v?.field_info;

  const candidates = [
    resolveLandLabel(v?.land, ""),
    resolveLandLabel(field, ""),
    asDisplayString(v?.land_name, ""),
    asDisplayString(v?.field_display, ""),
    typeof field === "string" ? field : "",
    asDisplayString(v?.field, ""),
  ];

  for (const c of candidates) {
    if (c && c !== DISPLAY_FALLBACK && c !== "[object Object]") {
      return c;
    }
  }

  const name = asDisplayString(
    v?.land_name ??
      (typeof field === "object" && field
        ? field.land_name ?? field.name ?? field.field_name ?? field.display_name
        : null) ??
      v?.field_display,
    ""
  );

  const rawArea =
    v?.land_area ??
    v?.acreage ??
    v?.land_size ??
    (typeof field === "object" && field
      ? field.land_size ?? field.land_area ?? field.area
      : null);

  const area =
    rawArea != null && rawArea !== "" ? asDisplayString(rawArea, "") : "";

  if (name && name !== DISPLAY_FALLBACK && area && area !== DISPLAY_FALLBACK) {
    return `${name} · ${area} ac`;
  }
  if (name && name !== DISPLAY_FALLBACK) return name;
  if (area && area !== DISPLAY_FALLBACK) return `${area} ac`;
  return DISPLAY_FALLBACK;
}

export function visitEmployeeLabel(v) {
  const label =
    resolveEmployeeLabel(v?.employee, "") ||
    asDisplayString(v?.employee_name, "") ||
    asDisplayString(v?.agent_name, "") ||
    asDisplayString(v?.employee_id, "");
  const out = label || DISPLAY_FALLBACK;
  return out === "[object Object]" ? DISPLAY_FALLBACK : out;
}

export function visitHasGps(v) {
  const lat = v?.latitude;
  const lng = v?.longitude;
  return lat != null && lng != null && lat !== "" && lng !== "";
}

/** Dev log helper for farmer block on a visit row */
export function logVisitFarmerBlock(visit, label = "[admin] visit list first item farmer block") {
  if (!visit) return;
  const block =
    visit.farmer ??
    {
      farmer_name: visit.farmer_name,
      farmer_mobile: visit.farmer_mobile,
      farmer_village: visit.farmer_village,
      crop_name: visit.crop_name,
    };
  console.log(label, block);
}
