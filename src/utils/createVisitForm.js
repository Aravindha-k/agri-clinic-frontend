/** Client field-visit form — mirrors backend visits/field_visit.py */

import { validateVisitMediaFiles } from "./visitMediaValidation";

export const PROBLEM_TYPE_CODES = {
  PEST: "pest",
  DISEASE: "disease",
  NUTRIENT: "nutrient_deficiency",
  OTHERS: "others",
};

export const PROBLEM_TYPE_PILLS = [
  { code: PROBLEM_TYPE_CODES.PEST, label: "Pest" },
  { code: PROBLEM_TYPE_CODES.DISEASE, label: "Disease" },
  { code: PROBLEM_TYPE_CODES.NUTRIENT, label: "Nutrient Deficiency" },
  { code: PROBLEM_TYPE_CODES.OTHERS, label: "Others" },
];

export function normalizeCategoryCode(category) {
  if (!category) return "";
  if (category.code) return String(category.code).toLowerCase();
  const n = String(category.name || "").toLowerCase();
  if (n.includes("pest")) return PROBLEM_TYPE_CODES.PEST;
  if (n.includes("disease")) return PROBLEM_TYPE_CODES.DISEASE;
  if (n.includes("nutrient")) return PROBLEM_TYPE_CODES.NUTRIENT;
  if (n.includes("other")) return PROBLEM_TYPE_CODES.OTHERS;
  return `legacy_${category.id}`;
}

export function categoryRequiresMaster(category, problemTypeCode) {
  if (problemTypeCode === PROBLEM_TYPE_CODES.OTHERS) return false;
  if (category?.requires_problem_master === false) return false;
  return true;
}

export function findCategoryForCode(categories, code) {
  return (categories || []).find((c) => normalizeCategoryCode(c) === code) ?? null;
}

function normalizePhone(value) {
  return String(value ?? "").replace(/\D/g, "");
}

export function validateCreateVisitForm(form, { mediaFiles = [] } = {}) {
  const errors = {};

  if (form.farmer_mode === "existing" && !form.farmer_id) {
    errors.farmer_id = "Select an existing farmer or switch to new farmer.";
  }

  const farmerName = String(form.farmer_name ?? "").trim();
  if (!farmerName) errors.farmer_name = "Farmer name is required.";

  const phone = normalizePhone(form.farmer_phone);
  if (!phone) errors.farmer_phone = "Phone number is required.";
  else if (phone.length < 10) errors.farmer_phone = "Enter at least 10 digits.";

  if (!form.village) errors.village = "Village is required.";

  if (!form.crop) errors.crop = "Crop is required.";

  const acreage = parseFloat(form.land_area);
  if (!String(form.land_area ?? "").trim() || Number.isNaN(acreage) || acreage <= 0) {
    errors.land_area = "Acreage is required and must be greater than 0.";
  }

  const problemIds = Array.isArray(form.problem_item_ids) ? form.problem_item_ids : [];
  if (problemIds.length === 0) {
    errors.problem_item_ids = "Select at least one problem.";
  }

  const description = String(form.problem_description ?? "").trim();
  if (!description) errors.problem_description = "Problem description is required.";

  if (mediaFiles?.length) {
    Object.assign(errors, validateVisitMediaFiles(mediaFiles));
  }

  return errors;
}

export function buildCreateVisitPayload(form) {
  const problemDescription = String(form.problem_description ?? "").trim();
  const phone = normalizePhone(form.farmer_phone);
  const acreage = parseFloat(form.land_area);
  const problemItemIds = (form.problem_item_ids || [])
    .map((id) => Number(id))
    .filter((id) => !Number.isNaN(id));

  const payload = {
    farmer_name: String(form.farmer_name ?? "").trim(),
    phone_number: phone,
    village: form.village,
    crop: form.crop,
    acreage,
    problem_item_ids: problemItemIds,
    problem_description: problemDescription,
    // Backend aliases (unchanged API contract)
    farmer_phone: phone,
    village_id: form.village,
    crop_id: form.crop,
    land_area: acreage,
    problem_seen: problemDescription,
  };

  if (form.farmer_mode === "existing" && form.farmer_id) {
    payload.farmer_id = form.farmer_id;
    payload.farmer = form.farmer_id;
  }

  return payload;
}

/** Build PATCH payload for visit problem updates */
export function buildVisitProblemUpdatePayload(form, { originalCropId } = {}) {
  const payload = {};
  const problemItemIds = (form.problem_item_ids || [])
    .map((id) => Number(id))
    .filter((id) => !Number.isNaN(id));

  if (Array.isArray(form.problem_item_ids)) {
    payload.problem_item_ids = problemItemIds;
  }

  const observation = String(form.problem_seen ?? "").trim();
  if (form.problem_seen !== undefined) {
    payload.problem_seen = observation;
  }

  if (form.field_notes !== undefined) {
    payload.field_notes = String(form.field_notes ?? "").trim();
    payload.observation = payload.field_notes;
  }

  if (form.action_taken !== undefined) {
    payload.action_taken = String(form.action_taken ?? "").trim();
  }

  const followUp = form.next_visit_date ?? form.follow_up_date;
  if (followUp !== undefined) {
    payload.next_visit_date = followUp || null;
    payload.follow_up_date = followUp || null;
  }

  if (originalCropId != null && form.crop_id != null && String(form.crop_id) !== String(originalCropId)) {
    payload.crop = form.crop_id;
    payload.crop_id = form.crop_id;
  }

  return payload;
}

export function extractProblemItemIdsFromVisit(visit) {
  if (!visit || typeof visit !== "object") return [];
  if (Array.isArray(visit.problems) && visit.problems.length > 0) {
    return visit.problems
      .map((p) => p?.id ?? p?.problem_item_id ?? p?.problem_master_id)
      .filter((id) => id != null);
  }
  const legacyId = visit.problem_master_id ?? visit.problem_item_id;
  return legacyId != null ? [legacyId] : [];
}

export function resolveVisitCropId(visit) {
  if (!visit || typeof visit !== "object") return null;
  const crop = visit.crop;
  if (crop && typeof crop === "object") return crop.id ?? null;
  return visit.crop_id ?? visit.crop ?? null;
}
