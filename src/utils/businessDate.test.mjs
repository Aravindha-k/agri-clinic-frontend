import assert from "node:assert/strict";
import {
  formatIndiaDate,
  formatIndiaDateTime,
  formatIndiaTime,
  visitUtcInstantFromFields,
} from "./businessDate.js";

function partsInIst(instant) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(instant).map((p) => [p.type, p.value])
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
  };
}

// 17:29 UTC → 22:59 IST same calendar day
{
  const instant = visitUtcInstantFromFields("2026-08-26", "17:29:00");
  assert.ok(instant);
  const ist = partsInIst(instant);
  assert.equal(ist.year, "2026");
  assert.equal(ist.month, "08");
  assert.equal(ist.day, "26");
  assert.equal(ist.hour, "22");
  assert.equal(ist.minute, "59");
  assert.match(formatIndiaDate(instant), /26 Aug 2026/i);
  assert.match(formatIndiaTime(instant), /10:59|22:59/i);
}

// Midnight crossing: 20:00 UTC → next day 01:30 IST
{
  const instant = visitUtcInstantFromFields("2026-08-26", "20:00:00");
  assert.ok(instant);
  const ist = partsInIst(instant);
  assert.equal(ist.year, "2026");
  assert.equal(ist.month, "08");
  assert.equal(ist.day, "27");
  assert.equal(ist.hour, "01");
  assert.equal(ist.minute, "30");
  assert.match(formatIndiaDate(instant), /27 Aug 2026/i);
}

// Full ISO Z input through formatIndiaDateTime
{
  const instant = new Date("2026-08-26T17:29:00Z");
  const ist = partsInIst(instant);
  assert.equal(ist.hour, "22");
  assert.equal(ist.minute, "59");
  assert.match(formatIndiaDateTime(instant), /26 Aug 2026/i);
  assert.match(formatIndiaDateTime(instant), /10:59|22:59/i);
}

console.log("businessDate IST regression checks OK");
