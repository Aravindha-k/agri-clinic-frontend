import {
  DISPLAY_FALLBACK,
  asDisplayString,
  resolveCropLabel,
} from "./displayValue";

export const VISIT_NOT_ADDED = "Not added by employee";
export const VISIT_FIELD_NOTES_LABEL = "Observation / Field Notes";

function pickVisitText(...candidates) {
  for (const c of candidates) {
    if (c == null || c === "") continue;
    if (typeof c === "object" && !Array.isArray(c)) {
      const nested = asDisplayString(c, "");
      if (nested && nested !== DISPLAY_FALLBACK && nested !== "[object Object]") {
        return nested;
      }
      continue;
    }
    const s = asDisplayString(c, "");
    if (s && s !== DISPLAY_FALLBACK && s !== "[object Object]") return s;
  }
  return null;
}

function legacyAdviceText(visit) {
  if (!visit || typeof visit !== "object") return null;
  const parts = [
    visit.general_advice,
    visit.fertilizer_advice,
    visit.pesticide_advice,
    visit.irrigation_advice,
    visit.recommendation,
    typeof visit.recommendations === "string" ? visit.recommendations : null,
  ]
    .map((p) => pickVisitText(p))
    .filter(Boolean);
  if (!parts.length) return null;
  return parts.join("\n");
}

/** Crop label for visit list/detail — never returns raw objects. */
export function resolveVisitCropDisplay(visit) {
  if (!visit || typeof visit !== "object") return VISIT_NOT_ADDED;

  const fromName = pickVisitText(visit.crop_name);
  if (fromName) return fromName;

  const crop = visit.crop_info ?? visit.crop;
  if (crop && typeof crop === "object") {
    const fromObj = pickVisitText(
      crop.name,
      crop.local_name,
      crop.name_en,
      crop.name_ta,
      crop.crop_name,
      crop.label
    );
    if (fromObj) return fromObj;
  }

  if (typeof crop === "string" && crop.trim()) return crop.trim();

  const farmer = visit.farmer ?? visit.farmer_info;
  const fromFarmer = pickVisitText(farmer?.crop_name, resolveCropLabel(farmer?.crop, ""));
  if (fromFarmer) return fromFarmer;

  const fromCrop = pickVisitText(resolveCropLabel(crop, ""));
  if (fromCrop) return fromCrop;

  return VISIT_NOT_ADDED;
}

/** Field notes / observation text with legacy fallbacks. */
export function resolveVisitFieldNotes(visit) {
  if (!visit || typeof visit !== "object") return VISIT_NOT_ADDED;

  const direct = pickVisitText(
    visit.field_notes,
    visit.observation,
    visit.observations,
    visit.recommendation,
    typeof visit.recommendations === "string" ? visit.recommendations : null,
    visit.notes
  );
  if (direct) return direct;

  const legacy = legacyAdviceText(visit);
  if (legacy) return legacy;

  return VISIT_NOT_ADDED;
}

export function resolveVisitProblemSeen(visit) {
  if (!visit || typeof visit !== "object") return VISIT_NOT_ADDED;
  return (
    pickVisitText(
      visit.problem_seen,
      visit.problem,
      visit.issue_observed,
      visit.crop_problem,
      visit.problem_description
    ) ?? VISIT_NOT_ADDED
  );
}

export function resolveVisitActionTaken(visit) {
  if (!visit || typeof visit !== "object") return VISIT_NOT_ADDED;
  return (
    pickVisitText(
      visit.action_taken,
      visit.actions_taken,
      visit.treatment_given,
      visit.intervention,
      visit.action
    ) ?? VISIT_NOT_ADDED
  );
}

export function resolveVisitFollowUpDate(visit) {
  if (!visit || typeof visit !== "object") return VISIT_NOT_ADDED;
  const raw =
    visit.follow_up_date ??
    visit.next_visit_date ??
    visit.followup_date ??
    visit.follow_up_on;
  if (!raw) return VISIT_NOT_ADDED;

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    const asText = pickVisitText(raw);
    return asText ?? VISIT_NOT_ADDED;
  }

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function truncateVisitText(text, max = 72) {
  if (!text || text === VISIT_NOT_ADDED) return text;
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

export function visitFieldIsMissing(value) {
  return !value || value === VISIT_NOT_ADDED || value === DISPLAY_FALLBACK;
}
