import fs from "fs";
import path from "path";

const root = path.resolve("src");

function ensureImport(t, depth) {
  if (t.includes("PageLoader")) return t;
  const imp =
    depth === 2
      ? 'import { PageLoader } from "../../components/ui/command";\n'
      : 'import { PageLoader } from "../components/ui/command";\n';
  return imp + t;
}

function replaceLoadingBlock(rel, label, depth = 1) {
  const fp = path.join(root, rel);
  const lines = fs.readFileSync(fp, "utf8").split("\n");
  const start = lines.findIndex((l) => l.trim() === "if (loading) {");
  if (start < 0) {
    console.log("NO_BLOCK", rel);
    return;
  }
  let end = start + 1;
  let depthBrace = 0;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    depthBrace += (line.match(/\{/g) || []).length;
    depthBrace -= (line.match(/\}/g) || []).length;
    if (i > start && depthBrace === 0) {
      end = i + 1;
      break;
    }
  }
  const block = [
    "    if (loading) {",
    "        return (",
    '            <div className="page-container">',
    `                <PageLoader label="${label}" />`,
    "            </div>",
    "        );",
    "    }",
  ];
  const out = [...lines.slice(0, start), ...block, ...lines.slice(end)];
  fs.writeFileSync(fp, ensureImport(out.join("\n"), depth));
  console.log("OK", rel);
}

function replaceInFile(rel, from, to, depth = 1) {
  const fp = path.join(root, rel);
  let t = ensureImport(fs.readFileSync(fp, "utf8"), depth);
  if (!t.includes(from)) {
    console.log("MISS_STR", rel);
    return;
  }
  fs.writeFileSync(fp, t.replace(from, to));
  console.log("OK_STR", rel);
}

replaceLoadingBlock("pages/Audit.jsx", "Loading audit log…");
replaceLoadingBlock("pages/Reports.jsx", "Loading reports…");
replaceLoadingBlock("pages/Notifications.jsx", "Loading notifications…");
replaceLoadingBlock("pages/masters/SystemSettings.jsx", "Loading settings…", 2);

replaceInFile(
  "pages/FarmerEditor.jsx",
  'return <div className="page-container text-center text-gray-500">Loading farmer...</div>;',
  'return (<div className="page-container"><PageLoader label="Loading farmer…" /></div>);'
);
