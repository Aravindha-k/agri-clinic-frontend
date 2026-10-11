/**
 * Regression guard: a page that renders <SomeLucideIcon/> without importing it
 * from "lucide-react" crashes at runtime ("X is not defined") behind the
 * PageErrorBoundary — this is what broke the Crop Directory page.
 *
 * For every src JSX file, every capitalized JSX identifier that is a real
 * lucide-react export must be imported (or locally defined) in that file.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import * as lucide from "lucide-react";

const SRC = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const LUCIDE = new Set(Object.keys(lucide));

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith(".jsx")) yield p;
  }
}

const failures = [];
for (const file of walk(SRC)) {
  const src = readFileSync(file, "utf8");
  const used = new Set([...src.matchAll(/<([A-Z][A-Za-z0-9_]*)/g)].map((m) => m[1]));
  const lucideUsed = [...used].filter((n) => LUCIDE.has(n));
  if (!lucideUsed.length) continue;
  const imported = new Set();
  for (const m of src.matchAll(/import\s+([^;]+?)\s+from\s+["'][^"']+["']/g)) {
    const clause = m[1];
    const dm = clause.match(/^\s*([A-Za-z_$][\w$]*)\s*(?:,|$)/);
    if (dm) imported.add(dm[1]);
    for (const grp of clause.matchAll(/\{([^}]+)\}/g)) {
      for (const part of grp[1].split(",")) {
        const name = part.trim().split(/\s+as\s+/).pop().trim();
        if (name) imported.add(name);
      }
    }
  }
  const defined = new Set(
    [...src.matchAll(/(?:function|const|class|let|var)\s+([A-Z][A-Za-z0-9_]*)/g)].map((m) => m[1])
  );
  /* Destructured prop aliases like `{ as: Tag }` or `{ icon: Icon }` are local names too. */
  for (const m of src.matchAll(/[a-zA-Z_$][\w$]*\s*:\s*([A-Z][A-Za-z0-9_]*)\s*[=,}]/g)) defined.add(m[1]);
  const missing = lucideUsed.filter((n) => !imported.has(n) && !defined.has(n));
  if (missing.length) failures.push(`${file}: ${missing.join(", ")}`);
}

assert.deepEqual(failures, [], `JSX uses lucide icons without importing them:\n${failures.join("\n")}`);
console.log("lucide import coverage OK");
