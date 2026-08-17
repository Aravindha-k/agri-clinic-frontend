import { resolveVisitProblems, groupVisitProblemsByCategory } from "../../utils/visitProblems";

function ProblemChip({ name, tamilName }) {
  return (
    <div className="visit-problems-chip">
      <span className="visit-problems-chip__name">{name}</span>
      {tamilName ? (
        <span className="visit-problems-chip__tamil" lang="ta">{tamilName}</span>
      ) : null}
    </div>
  );
}

export default function VisitProblemsPanel({ visit, className = "" }) {
  const problems = resolveVisitProblems(visit);
  const groups = groupVisitProblemsByCategory(problems);

  if (!problems.length) {
    return (
      <div className={`visit-problems-panel visit-problems-panel--empty ${className}`}>
        <p className="visit-problems-panel__empty">No problems recorded</p>
      </div>
    );
  }

  return (
    <div className={`visit-problems-panel ${className}`}>
      {groups.map(({ categoryName, items, count }) => (
        <div key={categoryName} className="visit-problems-group">
          <h4 className="visit-problems-group__title">
            {categoryName}
            <span className="visit-problems-group__count"> · {count}</span>
          </h4>
          <div className="visit-problems-group__list">
            {items.map((item) => (
              <ProblemChip
                key={item.id ?? `${categoryName}-${item.name}`}
                name={item.name}
                tamilName={item.tamilName}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function VisitProblemsSummaryLine({ visit, className = "" }) {
  const problems = resolveVisitProblems(visit);
  if (!problems.length) return null;

  const names = problems.slice(0, 2).map((p) => p.name).filter(Boolean);
  const extra = problems.length > 2 ? ` +${problems.length - 2}` : "";

  return (
    <p className={`visit-problems-summary-line ${className}`}>
      <span className="visit-problems-summary-line__count">
        {problems.length} problem{problems.length === 1 ? "" : "s"}
      </span>
      {names.length > 0 ? (
        <span className="visit-problems-summary-line__names">
          {names.join(" · ")}{extra}
        </span>
      ) : null}
    </p>
  );
}
