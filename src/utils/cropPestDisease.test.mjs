import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  CPD_CATEGORY,
  CPD_CATEGORY_ID,
  DISEASE_FIELD_NOTICE,
  TAMIL_PENDING,
  cropDisplayName,
  cropMatchesMappingSearch,
  cropProblemsPath,
  displayTamilName,
  extractCreatedMasterId,
  filterMappedMasters,
  mapSuccessMessage,
  normalizeAvailableMasters,
  normalizeCropPestDiseaseDetail,
  normalizeCropPestDiseaseList,
  normalizeCropPestDiseaseRow,
  resolveCategoryId,
  unmapConfirmCopy,
  unmapSuccessMessage,
} from "./cropPestDisease.js";

const apiSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../api/cropPestDisease.api.js"),
  "utf8"
);
const cpdPageSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../pages/masters/MasterCropPestDiseasePage.jsx"),
  "utf8"
);
const masterApiSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../api/master.api.js"),
  "utf8"
);

/* Dedicated CPD paths — never call legacy crop_id filter for mapped lists */
assert.match(apiSrc, /admin\/crop-pest-disease/);
assert.match(apiSrc, /available-masters/);
assert.match(apiSrc, /problem_master_id/);
assert.match(apiSrc, /admin\/problem-masters/);
assert.doesNotMatch(apiSrc, /api\.get\([^)]*problem-masters[^)]*crop_id/);
assert.doesNotMatch(apiSrc, /params:\s*\{[^}]*crop_id/);
assert.match(apiSrc, /\.post\(`\$\{BASE\}\/\$\{id\}\/map\/`, \{ problem_master_id \}\)/);
assert.match(apiSrc, /\.post\(`\$\{BASE\}\/\$\{id\}\/unmap\/`, \{ problem_master_id \}\)/);
assert.match(apiSrc, /api\.post\(`\$\{ADMIN_PROBLEM_MASTERS\}\/`, payload\)/);

/* ── List counts from backend ── */
const list = normalizeCropPestDiseaseList({
  count: 2,
  results: [
    {
      id: 10,
      name: "Tomato",
      name_en: "Tomato",
      tamil_name: "தக்காளி",
      is_active: true,
      pest_count: 9,
      disease_count: 11,
    },
    {
      id: 11,
      name_en: "Paddy",
      name_ta: "நெல்",
      is_active: true,
      pest_count: 10,
      disease_count: 8,
    },
  ],
});
assert.equal(list.count, 2);
assert.equal(list.results[0].pest_count, 9);
assert.equal(list.results[0].disease_count, 11);
assert.equal(list.results[1].pest_count, 10);
assert.equal(list.results[1].disease_count, 8);
assert.equal(list.results[0].id, 10);

/* Search English + Tamil */
assert.equal(cropMatchesMappingSearch(list.results[0], "tom"), true);
assert.equal(cropMatchesMappingSearch(list.results[0], "தக்"), true);
assert.equal(cropMatchesMappingSearch(list.results[0], "brinjal"), false);

/* Manage path uses integer crop id */
assert.equal(cropProblemsPath(10), "/masters/crops/10/problems");
assert.equal(cropProblemsPath("12"), "/masters/crops/12/problems");
assert.equal(cropProblemsPath("x"), "/masters/crops");

/* Detail: pest + disease + inactive disease still listed */
const detail = normalizeCropPestDiseaseDetail({
  crop: {
    id: 10,
    name: "Tomato",
    name_en: "Tomato",
    tamil_name: "தக்காளி",
    is_active: true,
  },
  pests: [
    { id: 1, name: "Fruit Borer", tamil_name: "காய்ப்புழு", is_active: true, category_code: "pest" },
    { id: 2, name: "Thrips", tamil_name: "", is_active: true, category_code: "pest" },
  ],
  diseases: [
    { id: 3, name: "Bacterial Wilt", tamil_name: "", is_active: true, category_code: "disease" },
  ],
  pest_count: 2,
  disease_count: 1,
});
assert.equal(detail.crop.id, 10);
assert.equal(detail.crop.name_en, "Tomato");
assert.equal(detail.crop.name_ta || detail.crop.tamil_name, "தக்காளி");
assert.equal(detail.pests.length, 2);
assert.equal(detail.diseases.length, 1);
assert.equal(detail.diseases[0].name, "Bacterial Wilt");
assert.equal(detail.pest_count, 2);
assert.equal(detail.disease_count, 1);

/* Tamil fallback — never invent */
assert.equal(displayTamilName(""), TAMIL_PENDING);
assert.equal(displayTamilName(null), TAMIL_PENDING);
assert.equal(displayTamilName("  "), TAMIL_PENDING);
assert.equal(displayTamilName("காய்ப்புழு"), "காய்ப்புழு");
assert.equal(displayTamilName(detail.diseases[0].tamil_name), TAMIL_PENDING);

/* Disease notice constant */
assert.match(DISEASE_FIELD_NOTICE, /not yet enabled for field use/i);

/* Available search normalize */
const available = normalizeAvailableMasters({
  crop_id: 10,
  category: "pest",
  count: 1,
  results: [{ id: 99, name: "Aphid", tamil_name: "", already_mapped: false, category_code: "pest" }],
});
assert.equal(available.crop_id, 10);
assert.equal(available.category, "pest");
assert.equal(available.results[0].id, 99);
assert.equal(available.results[0].already_mapped, false);

/* Local mapped filter */
const filtered = filterMappedMasters(detail.pests, "thrip");
assert.equal(filtered.length, 1);
assert.equal(filtered[0].id, 2);

/* Map mutation payload contract — integer only (tested via helpers) */
const row = normalizeCropPestDiseaseRow({ id: "5", pest_count: "3", disease_count: 0, name_en: "X" });
assert.equal(row.id, 5);
assert.equal(row.pest_count, 3);
assert.equal(normalizeCropPestDiseaseRow({ name_en: "no-id" }), null);

/* Unmap confirmation wording — mapping, not delete master */
const confirm = unmapConfirmCopy({ masterName: "Whitefly", cropName: "Tomato" });
assert.equal(confirm.message, "Remove Whitefly from Tomato?");
assert.match(confirm.support, /does not delete/i);
assert.doesNotMatch(confirm.message, /delete pest/i);
assert.doesNotMatch(confirm.title, /delete pest/i);

assert.equal(mapSuccessMessage({ masterName: "Thrips", cropName: "Tomato" }), "Thrips mapped to Tomato.");
assert.equal(unmapSuccessMessage({ masterName: "Whitefly", cropName: "Tomato" }), "Whitefly removed from Tomato.");

/* Category resolve by code with fallback PKs */
assert.equal(
  resolveCategoryId([{ id: 16, code: "pest" }, { id: 17, code: "disease" }], CPD_CATEGORY.PEST, 99),
  16
);
assert.equal(
  resolveCategoryId([{ id: 17, code: "disease" }], CPD_CATEGORY.DISEASE, CPD_CATEGORY_ID.DISEASE),
  17
);
assert.equal(resolveCategoryId([], CPD_CATEGORY.PEST, CPD_CATEGORY_ID.PEST), 16);

/* Created master id extraction */
assert.equal(extractCreatedMasterId({ id: 55 }), 55);
assert.equal(extractCreatedMasterId({ data: { id: 66 } }), 66);
assert.equal(extractCreatedMasterId({ name: "x" }), null);

assert.equal(cropDisplayName(detail.crop), "Tomato");
assert.equal(CPD_CATEGORY.PEST, "pest");
assert.equal(CPD_CATEGORY.DISEASE, "disease");

/* ProblemMaster update + crop mapping edit UX */
assert.match(masterApiSrc, /api\.patch\(`\$\{PROBLEM_MASTER_BASE\}\/\$\{id\}\/`/);
assert.match(cpdPageSrc, /updateProblemMaster\(editMaster\.id, payload\)/);
assert.match(cpdPageSrc, /Changes to this master will appear for every crop where it is used/);
assert.match(cpdPageSrc, /Remove mapping/);
assert.doesNotMatch(cpdPageSrc, /Delete Master/);

console.log("cropPestDisease checks OK");
