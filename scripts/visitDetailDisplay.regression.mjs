/**
 * Static regression checks for visit detail location + evidence normalization.
 * Run: node scripts/visitDetailDisplay.regression.mjs
 */

import assert from "node:assert/strict";
import { resolveDistrictLabel, resolveVillageLabel } from "../src/utils/displayValue.js";
import { resolveLocationBlock, TALUK_NOT_ASSIGNED } from "../src/utils/locationDisplay.js";
import { resolveVisitFarmer } from "../src/utils/visitFarmer.js";
import {
  normalizeVisitAttachment,
  normalizeVisitEvidenceList,
  resolveVisitAttachmentCount,
} from "../src/utils/visitAttachments.js";

assert.equal(resolveDistrictLabel(23), "—");
assert.equal(resolveDistrictLabel({ id: 23, name: "Trichy" }), "Trichy");
assert.equal(resolveVillageLabel(117), "—");

const visit = {
  district: 23,
  district_name: "Trichy",
  taluk_name: "Lalgudi",
  village_name: "Kedar",
  evidence_count: 1,
  evidence: [
    {
      evidence_key: "visit_media:3",
      attachment_type: "image",
      file_url: "/media/visit_media/field.jpg",
      mime_type: "image/jpeg",
      filename: "field.jpg",
    },
  ],
};

const farmer = resolveVisitFarmer(visit);
assert.equal(farmer.district, "Trichy");
assert.equal(farmer.taluk, "Lalgudi");
assert.equal(farmer.village, "Kedar");

const block = resolveLocationBlock(visit);
assert.equal(block.district, "Trichy");
assert.equal(block.taluk, "Lalgudi");
assert.equal(block.village, "Kedar");
assert.equal(resolveLocationBlock({ taluk_id: null }).taluk, TALUK_NOT_ASSIGNED);

assert.equal(resolveVisitAttachmentCount(visit), 1);
const normalized = normalizeVisitEvidenceList(visit.evidence);
assert.equal(normalized.length, 1);
assert.equal(normalized[0].kind, "image");
assert.ok(normalized[0].url.includes("/media/visit_media/field.jpg"));

console.log("visitDetailDisplay.regression: PASS");
