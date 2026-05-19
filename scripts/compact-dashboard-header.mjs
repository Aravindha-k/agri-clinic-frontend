import fs from "fs";

const p = "src/pages/Dashboard.jsx";
let t = fs.readFileSync(p, "utf8");

const re =
  /const SectionHeader = \(\{ icon: Icon, title, subtitle, right \}\) => \(\r?\n  <div className="px-6 py-4 border-b[\s\S]*?\r?\n\);/;

const replacement = `const SectionHeader = ({ icon: Icon, title, subtitle, right }) => (
  <div className="section-card-header">
    <div className="flex items-center gap-2.5 min-w-0">
      {Icon && (
        <div className="icon-box">
          <Icon className="w-3.5 h-3.5" strokeWidth={2} />
        </div>
      )}
      <div className="min-w-0">
        <h3 className="section-title">{title}</h3>
        {subtitle && <p className="section-subtitle">{subtitle}</p>}
      </div>
    </div>
    {right}
  </div>
);`;

if (!re.test(t)) {
  console.log("NO_MATCH");
  process.exit(1);
}
t = t.replace(re, replacement);
fs.writeFileSync(p, t);
console.log("OK");
