import fs from "fs";
import path from "path";

const root = path.resolve("src");
const imp2 = 'import { PageLoader } from "../../components/ui/command";\n';
const imp1 = 'import { PageLoader } from "../components/ui/command";\n';

const files = [
  "pages/Crops.jsx",
  "pages/Issues.jsx",
  "pages/Recommendations.jsx",
  "pages/Employees.jsx",
  "pages/Tracking.jsx",
  "pages/masters/MasterFarmers.jsx",
  "pages/masters/MasterEmployees.jsx",
  "pages/masters/MasterCrops.jsx",
  "pages/masters/MasterDistricts.jsx",
  "pages/masters/MasterVillages.jsx",
  "pages/masters/MasterProblemCategories.jsx",
  "pages/masters/MasterLocationsPage.jsx",
  "pages/masters/MasterCropsPage.jsx",
];

for (const rel of files) {
  const fp = path.join(root, rel);
  let t = fs.readFileSync(fp, "utf8");
  if (/import\s+\{[^}]*PageLoader/.test(t)) {
    console.log("HAS_IMPORT", rel);
    continue;
  }
  if (!t.includes("<PageLoader")) {
    console.log("NO_USAGE", rel);
    continue;
  }
  const imp = rel.includes("masters/") ? imp2 : imp1;
  fs.writeFileSync(fp, imp + t);
  console.log("ADDED", rel);
}

// MasterCropsPage skeleton
const cropsPage = path.join(root, "pages/masters/MasterCropsPage.jsx");
let t = fs.readFileSync(cropsPage, "utf8");
const re =
  /\{loading \? \(\r?\n\s*<div className="section-card overflow-hidden"[\s\S]*?\r?\n\s*\) : filtered\.length === 0 \?/;
if (re.test(t) && !t.includes('label="Loading crops…"')) {
  t = t.replace(
    re,
    `{loading ? (
                <PageLoader label="Loading crops…" />
            ) : filtered.length === 0 ?`
  );
  if (!/import\s+\{[^}]*PageLoader/.test(t)) t = imp2 + t;
  fs.writeFileSync(cropsPage, t);
  console.log("PATCHED", "MasterCropsPage.jsx");
}
