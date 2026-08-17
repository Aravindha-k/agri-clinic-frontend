import { asDisplayString, DISPLAY_FALLBACK } from "./displayValue";
import { resolveProblemCategoryLabel, resolveProblemEnglishName, resolveProblemTamilName } from "./problemMasterDisplay";

const OTHER_GROUP = "Other";

function normalizeProblemItem(item) {
  if (!item || typeof item !== "object") return null;
  const id = item.id ?? item.problem_item_id ?? item.problem_master_id;
  const name = item.name ?? resolveProblemEnglishName(item);
  const tamilName = item.tamil_name ?? item.name_ta ?? resolveProblemTamilName(item);
  const category = item.category;
  const categoryName =
    category?.name ??
    item.category_name ??
    resolveProblemCategoryLabel(item);

  if (!name && !id) return null;

  return {
    id,
    name: name || DISPLAY_FALLBACK,
    tamilName: tamilName || "",
    categoryName: categoryName && categoryName !== "—" ? categoryName : OTHER_GROUP,
    categoryCode: category?.code ?? item.category_code ?? "",
  };
}

function resolveLegacySingleProblem(visit) {
  if (!visit || typeof visit !== "object") return null;

  const master = visit.problem_master ?? visit.problem_item ?? visit.problem;
  if (master && typeof master === "object") {
    const normalized = normalizeProblemItem({
      ...master,
      category: master.category ?? visit.problem_category,
    });
    if (normalized) return normalized;
  }

  const description =
    visit.problem_description ??
    visit.problem_seen ??
    visit.problem ??
    visit.issue_observed;

  const category =
    visit.problem_category ??
    (typeof visit.problem_category_id === "object" ? visit.problem_category_id : null);

  if (description || category || visit.problem_master_id || visit.problem_category_id) {
    const name =
      (typeof master === "string" ? master : null) ||
      (description ? String(description).trim() : null) ||
      "Problem recorded";

    return normalizeProblemItem({
      id: visit.problem_master_id ?? visit.problem_item_id,
      name,
      tamil_name: visit.problem_tamil_name,
      category: typeof category === "object" ? category : { name: category || OTHER_GROUP },
    });
  }

  return null;
}

/** Primary read path: problems[] with legacy fallback */
export function resolveVisitProblems(visit) {
  if (!visit || typeof visit !== "object") return [];

  if (Array.isArray(visit.problems) && visit.problems.length > 0) {
    return visit.problems.map(normalizeProblemItem).filter(Boolean);
  }

  const legacy = resolveLegacySingleProblem(visit);
  return legacy ? [legacy] : [];
}

export function groupVisitProblemsByCategory(problems = []) {
  const groups = new Map();
  for (const problem of problems) {
    const key = problem.categoryName || OTHER_GROUP;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(problem);
  }
  return Array.from(groups.entries()).map(([categoryName, items]) => ({
    categoryName,
    items,
    count: items.length,
  }));
}

export function formatVisitProblemsSummary(problems = [], { maxNames = 2 } = {}) {
  if (!problems.length) return null;
  if (problems.length === 1) return problems[0].name;
  const names = problems.slice(0, maxNames).map((p) => p.name).filter(Boolean);
  const suffix = problems.length > maxNames ? ` +${problems.length - maxNames} more` : "";
  return `${problems.length} problems · ${names.join(" · ")}${suffix}`;
}

export function visitProblemsCountLabel(count) {
  if (!count) return null;
  return `${count} problem${count === 1 ? "" : "s"}`;
}

export function hasVisitProblems(visit) {
  return resolveVisitProblems(visit).length > 0;
}
