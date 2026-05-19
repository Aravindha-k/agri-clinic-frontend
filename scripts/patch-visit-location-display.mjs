import fs from "fs";

const fp = "src/pages/VisitDetail.jsx";
let t = fs.readFileSync(fp, "utf8");

if (!t.includes("VisitLocationDisplay")) {
  t = t.replace(
    'import VisitEvidenceSection from "../components/visits/VisitEvidenceSection";',
    'import VisitEvidenceSection from "../components/visits/VisitEvidenceSection";\nimport VisitLocationDisplay from "../components/visits/VisitLocationDisplay";'
  );
}

const re =
  /\{hasGps \? \(\s*<>[\s\S]*?<\/>\s*\) : \(\s*<div className="rounded-xl border border-amber-100/;

const replacement = `{hasGps ? (
                                    <VisitLocationDisplay
                                        visit={v}
                                        coords={coords}
                                        mapsUrl={mapsUrl}
                                        mapSlot={<VisitLocationMap lat={coords.lat} lng={coords.lng} />}
                                    />
                                ) : (
                                    <div className="rounded-xl border border-amber-100`;

if (!re.test(t)) {
  console.log("NO_MATCH");
  process.exit(1);
}

t = t.replace(re, replacement);
fs.writeFileSync(fp, t);
console.log("OK");
