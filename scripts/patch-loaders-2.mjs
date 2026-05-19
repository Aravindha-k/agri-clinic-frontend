import fs from "fs";
import path from "path";

const root = path.resolve("src");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function write(rel, t) {
  fs.writeFileSync(path.join(root, rel), t, "utf8");
  console.log("OK", rel);
}

function ensurePageLoader(t, depth = 1) {
  if (t.includes("PageLoader")) return t;
  const line =
    depth === 2
      ? 'import { PageLoader } from "../../components/ui/command";\n'
      : 'import { PageLoader } from "../components/ui/command";\n';
  return line + t;
}

function patch(rel, fn, depth = 1) {
  const before = read(rel);
  const after = fn(before);
  if (after === before) {
    console.log("SKIP", rel);
    return;
  }
  write(rel, depth === 0 ? after : ensurePageLoader(after, depth));
}

const farmerLoadingRe =
  /if \(loading\) return \(\r?\n\s*<div className="p-6 max-w-5xl mx-auto space-y-4 animate-pulse">[\s\S]*?\r?\n\s*\);/;

const farmerLoadingNew = `if (loading) {
        return (
            <div className="page-container">
                <PageLoader label="Loading farmer…" />
            </div>
        );
    }`;

patch("pages/FarmerDetail.jsx", (t) => t.replace(farmerLoadingRe, farmerLoadingNew));

patch("pages/Crops.jsx", (t) =>
  t.replace(
    "{loading ? <TableSkeleton /> : filtered.length === 0 ? (",
    '{loading ? <PageLoader label="Loading crops…" /> : filtered.length === 0 ? ('
  )
);

patch("pages/Issues.jsx", (t) =>
  t.replace(
    "{loading ? <TableSkeleton /> : filteredIssues.length === 0 ? (",
    '{loading ? <PageLoader label="Loading issues…" /> : filteredIssues.length === 0 ? ('
  )
);

patch("pages/Recommendations.jsx", (t) =>
  t.replace(
    "{loading ? <TableSkeleton /> : enrichedRecommendations.length === 0 ? (",
    '{loading ? <PageLoader label="Loading recommendations…" /> : enrichedRecommendations.length === 0 ? ('
  )
);

patch("pages/FarmersList.jsx", (t) => {
  let out = t.replace(
    'import { PageHeader, FilterBar, EmptyState } from "../components/ui/command";',
    'import { PageHeader, FilterBar, EmptyState, PageLoader } from "../components/ui/command";'
  );
  return out.replace(
    /{loading \? \(\r?\n\s*<div className="list-grid">[\s\S]*?\r?\n\s*\) : filteredFarmers/,
    `{loading ? (
                <PageLoader label="Loading farmers…" />
            ) : filteredFarmers`
  );
}, 0);

patch("pages/Employees.jsx", (t) =>
  t.replace(
    "if (isLoading) return <GridSkeleton />;",
    'if (isLoading) return <PageLoader label="Loading employees…" />;'
  )
);

patch("pages/Tracking.jsx", (t) =>
  t.replace(
    /{loading \? \(\r?\n\s*<div className="flex items-center justify-center h-40">[\s\S]*?\r?\n\s*\) :/,
    `{loading ? (
                                <PageLoader label="Loading employee data…" />
                            ) :`
  )
);

const masterSkeleton = (label) => `<PageLoader label="${label}" />`;
const masters = [
  ["pages/masters/MasterFarmers.jsx", 6, "Loading farmers…"],
  ["pages/masters/MasterEmployees.jsx", 7, "Loading employees…"],
  ["pages/masters/MasterCrops.jsx", 5, "Loading crops…"],
  ["pages/masters/MasterDistricts.jsx", 4, "Loading districts…"],
  ["pages/masters/MasterVillages.jsx", 5, "Loading villages…"],
  ["pages/masters/MasterProblemCategories.jsx", 4, "Loading categories…"],
];

for (const [rel, cols, label] of masters) {
  patch(
    rel,
    (t) => {
      if (t.includes(`label="${label}"`)) return t;
      return t
        .replace(`<TableSkeleton rows={8} cols={${cols}} />`, masterSkeleton(label))
        .replace(
          "{loading ? <TableSkeleton rows={8} cols={7} /> : paginated.length === 0 ? (",
          `{loading ? ${masterSkeleton(label)} : paginated.length === 0 ? (`
        );
    },
    2
  );
}

const locSkeletonRe =
  /\{loading \? \(\r?\n\s*<div className="section-card overflow-hidden"[\s\S]*?\r?\n\s*\) : currentList\.length === 0 \?/;

patch("pages/masters/MasterLocationsPage.jsx", (t) =>
  t.replace(locSkeletonRe, `{loading ? (
                <PageLoader label="Loading locations…" />
            ) : currentList.length === 0 ?`),
  2
);

patch("pages/masters/MasterCropsPage.jsx", (t) =>
  t.replace(locSkeletonRe, `{loading ? (
                <PageLoader label="Loading crops…" />
            ) : currentList.length === 0 ?`),
  2
);

// Widgets — AgriLoader compact
function patchWidget(rel, importLine, replaceFrom, replaceTo) {
  let t = read(rel);
  if (t.includes("AgriLoader")) {
    console.log("SKIP", rel);
    return;
  }
  if (!t.includes(replaceFrom)) {
    console.log("MISS", rel);
    return;
  }
  t = importLine + t.replace(replaceFrom, replaceTo);
  write(rel, t);
}

patchWidget(
  "components/RainfallWidget.jsx",
  'import AgriLoader from "./ui/command/AgriLoader";\n',
  '<motion.div className="text-sm text-blue-200">Loading...</div>',
  '<AgriLoader label="Fetching rainfall…" size="sm" />'
);

patchWidget(
  "components/WeatherWidget.jsx",
  'import AgriLoader from "./ui/command/AgriLoader";\n',
  '<div className="text-sm text-slate-400">Loading...</div>',
  '<AgriLoader label="Fetching weather…" size="sm" />'
);

// index duplicate export
let idx = read("components/ui/command/index.js");
if (idx.includes("PageLoader } from \"./SkeletonCard\"")) {
  idx = idx.replace(
    "export { SkeletonCard, SkeletonTable, PageLoader } from \"./SkeletonCard\";",
    'export { SkeletonCard, SkeletonTable } from "./SkeletonCard";'
  );
  write("components/ui/command/index.js", idx);
}
