import { Check } from "lucide-react";
import {
  activityEmployeeUserId,
  employeeActivityCardA11y,
  employeeActivityMeta,
  visitEmployeeCode,
  visitEmployeeDisplayName,
  visitEmployeeOptionLabel,
} from "../../utils/visitsActivity";

export function EmployeeActivitySkeleton() {
  return (
    <div className="visits-emp-grid" aria-busy="true" aria-label="Loading employee activity">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="visits-emp-card visits-emp-card--skeleton">
          <div className="skeleton h-4 w-28 rounded" />
          <div className="skeleton h-3 w-16 rounded mt-1.5" />
          <div className="skeleton h-4 w-14 rounded mt-3" />
          <div className="skeleton h-3 w-24 rounded mt-1.5" />
        </div>
      ))}
    </div>
  );
}

export default function EmployeeActivityStrip({
  employees,
  selectedUserId,
  onSelectEmployee,
  onSelectAll,
}) {
  const selected = String(selectedUserId || "");

  return (
    <div className="visits-emp-panel">
      <div className="visits-emp-all-wrap">
        <button
          type="button"
          className={`visits-emp-all ${selected ? "" : "visits-emp-all--active"}`}
          aria-pressed={!selected}
          onClick={onSelectAll}
        >
          All Employees
        </button>
      </div>
      <div className="visits-emp-grid">
        {(employees || []).map((emp, index) => {
          const userId = activityEmployeeUserId(emp);
          const name = visitEmployeeDisplayName(emp);
          const code = visitEmployeeCode(emp);
          const meta = employeeActivityMeta(emp);
          const isSelected = Boolean(userId && userId === selected);
          const a11y = employeeActivityCardA11y({
            selected: isSelected,
            name,
            code,
          });
          const key = userId || `${code || name || "emp"}-${index}`;
          const className = [
            "visits-emp-card",
            isSelected ? "visits-emp-card--selected" : "",
            meta.zero ? "visits-emp-card--zero" : "",
            userId ? "" : "visits-emp-card--disabled",
          ]
            .filter(Boolean)
            .join(" ");

          if (!userId) {
            return (
              <div key={key} className={className}>
                <p className="visits-emp-card__name">{name || "Employee"}</p>
                {code ? <p className="visits-emp-card__code">{code}</p> : null}
                <p className="visits-emp-card__count">{meta.visitsLabel}</p>
                <p className="visits-emp-card__detail">{meta.detail}</p>
              </div>
            );
          }

          return (
            <button
              key={key}
              {...a11y}
              className={className}
              onClick={() => onSelectEmployee(userId)}
            >
              <span className="visits-emp-card__top">
                <span className="visits-emp-card__name">{name || visitEmployeeOptionLabel(emp)}</span>
                {isSelected ? (
                  <span className="visits-emp-card__selected-mark" aria-hidden="true">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                ) : null}
              </span>
              {code ? <span className="visits-emp-card__code">{code}</span> : null}
              <span className="visits-emp-card__count">{meta.visitsLabel}</span>
              <span className="visits-emp-card__detail">{meta.detail}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
