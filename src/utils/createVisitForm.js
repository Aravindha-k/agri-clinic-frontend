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

export function validateCreateVisitForm(
  form,
  { requiresMaster = true, mediaFiles = [] } = {}
) {
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

  if (!form.problem_type_code) {
    errors.problem_type_code = "Problem type is required.";
  }

  if (!form.problem_category) {
    errors.problem_category = "Problem category is required.";
  }

  const description = String(form.problem_description ?? "").trim();
  if (!description) errors.problem_description = "Problem description is required.";

  if (requiresMaster && !form.problem_master) {
    errors.problem_master = "Select a problem from the list.";
  }

  if (form.problem_type_code === PROBLEM_TYPE_CODES.OTHERS) {
    const other = String(form.problem_other ?? "").trim();
    if (!other) errors.problem_other = "Other problem is required.";
  }

  if (mediaFiles?.length) {
    Object.assign(errors, validateVisitMediaFiles(mediaFiles));
  }

  return errors;
}

export function buildCreateVisitPayload(form, categories) {
  const category =
    findCategoryForCode(categories, form.problem_type_code) ||
    categories.find((c) => c.id === form.problem_category);

  const problemDescription = String(form.problem_description ?? "").trim();
  const otherLabel = String(form.problem_other ?? "").trim();
  const categoryId = category?.id ?? form.problem_category;
  const masterId = form.problem_master || null;
  const phone = normalizePhone(form.farmer_phone);
  const acreage = parseFloat(form.land_area);

  const problemSubcategory =
    form.problem_type_code === PROBLEM_TYPE_CODES.OTHERS
      ? otherLabel || null
      : masterId;

  const payload = {
    farmer_name: String(form.farmer_name ?? "").trim(),
    phone_number: phone,
    village: form.village,
    crop: form.crop,
    acreage,
    problem_category: categoryId,
    problem_subcategory: problemSubcategory,
    problem_description: problemDescription,
    // Backend aliases (unchanged API contract)
    farmer_phone: phone,
    village_id: form.village,
    crop_id: form.crop,
    land_area: acreage,
    problem_category_id: categoryId,
    problem_master: masterId,
    problem_master_id: masterId,
    problem_seen: problemDescription,
  };

  if (form.farmer_mode === "existing" && form.farmer_id) {
    payload.farmer_id = form.farmer_id;
    payload.farmer = form.farmer_id;
  }

  return payload;
}
