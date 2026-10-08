/**
 * Admin UX hardening checks — guards for the full-app audit findings
 * and the Pass-1 premium visual system contracts.
 * Run: node src/utils/adminUx.test.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = (p) => readFileSync(resolve(here, p), "utf8");

const appSrc = src("../App.jsx");
const issuesSrc = src("../pages/Issues.jsx");
const navSrc = src("../components/layout/navConfig.js");
const motionSrc = src("./motion.js");
const toastSrc = src("../components/ui/Toast.jsx");
const mastersSrc = src("../pages/Masters.jsx");
const cssSrc = src("../index.css");
const htmlSrc = src("../../index.html");
const sidebarNavSrc = src("../components/layout/SidebarNavItem.jsx");
const kpiSrc = src("../components/ui/PremiumKpiCard.jsx");
const dashSrc = src("../pages/Dashboard.jsx");

/* ── Routes ── */
// Catch-all route exists so unknown URLs never render a blank shell.
assert.match(appSrc, /<Route path="\*" element={<NotFound \/>} \/>/);
assert.match(appSrc, /import NotFound from "\.\/pages\/NotFound"/);
// Legacy masters routes remain registered (hidden but reachable).
assert.match(appSrc, /masters\/problem-categories/);
assert.match(appSrc, /masters\/problem-items/);
assert.match(appSrc, /masters\/crops\/:cropId\/problems/);

/* ── Issues.jsx: every lucide icon used in JSX must be imported ── */
const iconsUsed = ["Leaf", "RefreshCw", "Search", "Wheat", "X"];
for (const icon of iconsUsed) {
  assert.ok(
    new RegExp(`<${icon}[\\s/>]`).test(issuesSrc),
    `${icon} should be rendered in Issues.jsx`,
  );
  assert.ok(
    new RegExp(`\\b${icon}\\b`).test(
      issuesSrc.match(/import\s*{[^}]+}\s*from\s*"lucide-react"/)?.[0] ?? "",
    ),
    `${icon} must be imported from lucide-react in Issues.jsx`,
  );
}

/* ── Nav icons use semantic lucide icons ── */
assert.match(navSrc, /label: "Crop Directory", icon: Wheat/);
assert.match(navSrc, /label: "Audit Log", icon: ShieldCheck/);
assert.match(navSrc, /label: "Security & Sessions", icon: LockKeyhole/);
assert.doesNotMatch(navSrc, /icon: AlertTriangle/);

/* ── Shared motion utility ── */
assert.match(motionSrc, /export function useCountUp/);
assert.match(motionSrc, /export function usePrefersReducedMotion/);
assert.match(motionSrc, /prefers-reduced-motion/);
// PremiumKpiCard consumes the shared hook, not a local copy.
assert.match(kpiSrc, /import \{ useCountUp \} from "\.\.\/\.\.\/utils\/motion"/);
assert.doesNotMatch(kpiSrc, /function useCountUp/);

/* ── Toast: entrance/exit + aria-live + teal info ── */
assert.match(toastSrc, /app-toast--enter/);
assert.match(toastSrc, /app-toast--exit/);
assert.match(toastSrc, /aria-live/);
assert.match(toastSrc, /role="status"/);
assert.match(toastSrc, /info: "bg-teal-50 border-teal-200 text-teal-900"/);
assert.doesNotMatch(toastSrc, /bg-blue-50/);

/* ── Masters hub: exactly 3 business cards, no legacy links ── */
const hubPaths = mastersSrc.match(/path: "\/masters\//g) ?? [];
assert.equal(hubPaths.length, 3);
assert.doesNotMatch(mastersSrc, /problem-categories|problem-items/);
assert.match(mastersSrc, /Crop \/ Pest \/ Disease Master/);
assert.match(mastersSrc, /raised-icon-well/);

/* ── Sidebar nav item has raised icon well ── */
assert.match(sidebarNavSrc, /sidebar-nav-item__icon/);

/* ── CSS foundation ── */
assert.match(cssSrc, /--duration-fast: 140ms/);
assert.match(cssSrc, /--duration-normal: 220ms/);
assert.match(cssSrc, /--duration-slow: 320ms/);
assert.match(cssSrc, /--ease-enterprise: cubic-bezier\(0\.22, 1, 0\.36, 1\)/);
assert.match(cssSrc, /\.raised-icon-well--emerald/);
assert.match(cssSrc, /\.raised-icon-well--amber/);
assert.match(cssSrc, /\.elev-1/);
assert.match(cssSrc, /\[lang="ta"\]/);
assert.match(cssSrc, /prefers-reduced-motion: reduce/);
assert.match(cssSrc, /@keyframes toastEnter/);
assert.match(cssSrc, /@keyframes toastExit/);
assert.match(cssSrc, /xl:grid-cols-3/);

/* ── Tamil font loaded ── */
assert.match(htmlSrc, /Noto\+Sans\+Tamil:wght@400;500;600/);

/* ── Dashboard ops band uses real stats only ── */
assert.match(dashSrc, /dashboard-ops-band/);
assert.match(dashSrc, /opsGreeting/);
assert.match(dashSrc, /dashboard-visit-row/);

console.log("adminUx hardening checks OK");
