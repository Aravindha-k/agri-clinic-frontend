/**
 * Agriculture map-marker kind resolution.
 *
 * Maps a visit/route-marker payload to a semantic marker kind using
 * ONLY explicit fields (visit_type, problem categories, crop_name).
 * No keyword sniffing of free-text descriptions — missing data resolves
 * to a neutral "visit" pin rather than a guessed category.
 */

export const MARKER_KIND = {
  VISIT: "visit",
  CROP: "crop",
  ADVISORY: "advisory",
  PEST: "pest",
  DISEASE: "disease",
  IRRIGATION: "irrigation",
  SOIL: "soil",
  UNKNOWN: "unknown",
};

const TYPE_MATCHERS = [
  [/(irrigat|water|drip|sprinkler|bore)/, MARKER_KIND.IRRIGATION],
  [/(soil|diagnos|lab|sample|test)/, MARKER_KIND.SOIL],
  [/(pest|insect|bug)/, MARKER_KIND.PEST],
  [/(disease|fung|blight|rot)/, MARKER_KIND.DISEASE],
  [/(advis|consult|counsel|guid)/, MARKER_KIND.ADVISORY],
  [/(crop|inspect|survey)/, MARKER_KIND.CROP],
];

function norm(value) {
  return String(value ?? "").trim().toLowerCase();
}

function problemCategories(visit) {
  const cats = [];
  const problems = Array.isArray(visit?.problems) ? visit.problems : [];
  for (const p of problems) {
    const c = norm(p?.category ?? p?.categoryName ?? p?.category_name);
    if (c) cats.push(c);
  }
  const single = norm(visit?.problem_category?.category ?? visit?.problem_category);
  if (single) cats.push(single);
  return cats;
}

/**
 * Resolve the marker kind for a visit payload or route-map marker.
 * @returns {string} one of MARKER_KIND
 */
export function visitMarkerKind(visit) {
  if (!visit || typeof visit !== "object") return MARKER_KIND.UNKNOWN;

  // 1. Explicit type/purpose/category field wins.
  const typeStr = norm(
    visit.visit_type ?? visit.purpose ?? visit.visit_category ?? visit.marker_kind
  );
  for (const [re, kind] of TYPE_MATCHERS) {
    if (typeStr && re.test(typeStr)) return kind;
  }

  // 2. Problem records — real pest/disease associations.
  const cats = problemCategories(visit);
  if (cats.some((c) => /(disease|fung|blight|rot|virus)/.test(c))) {
    return MARKER_KIND.DISEASE;
  }
  if (cats.some((c) => /(pest|insect|mite|worm|bug)/.test(c))) {
    return MARKER_KIND.PEST;
  }
  const hasProblem =
    cats.length > 0 ||
    visit.problem_master_id != null ||
    visit.problem_category_id != null ||
    visit.problem_description != null ||
    visit.issue_observed != null;
  if (hasProblem) return MARKER_KIND.PEST;

  // 3. Crop context → crop inspection.
  if (norm(visit.crop_name) || visit.crop_id != null || visit.crop != null) {
    return MARKER_KIND.CROP;
  }

  // 4. A visit with coordinates/id but no category → generic field visit.
  if (visit.visitId != null || visit.visit_id != null || visit.id != null || visit.latitude != null) {
    return MARKER_KIND.VISIT;
  }
  return MARKER_KIND.UNKNOWN;
}
