import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import {
  activityEmployeeUserId,
  activityShowsDuty,
  employeeActivityCardA11y,
  employeeActivityMeta,
  employeeDutyPresentation,
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

function DutyStatusLine({ presentation }) {
  if (!presentation) return null;
  return (
    <span className={`visits-emp-duty__status visits-emp-duty__status--${presentation.tone}`}>
      <span className="visits-emp-duty__mark" aria-hidden="true" />
      <span>{presentation.statusLabel}</span>
    </span>
  );
}

function DutyRows({ presentation }) {
  if (!presentation?.rows?.length) return null;
  return (
    <span className="visits-emp-duty__rows">
      {presentation.rows.map((row) => (
        <span
          key={row.key}
          className={`visits-emp-duty__row visits-emp-duty__row--${row.key}`}
        >
          <span className="visits-emp-duty__label">{row.label}</span>
          <span className="visits-emp-duty__value">{row.value}</span>
        </span>
      ))}
    </span>
  );
}

/** Visit meta line — two-column when "Last visit · …", muted plain text for zero-visit copy. */
function VisitDetailLine({ meta, withDuty }) {
  if (!meta?.detail) return null;
  const visitClass = [
    "visits-emp-card__detail",
    withDuty ? "visits-emp-card__detail--after-duty" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (meta.zero) {
    return <span className={visitClass}>{meta.detail}</span>;
  }

  const sep = " · ";
  const idx = meta.detail.indexOf(sep);
  if (meta.detail.startsWith("Last visit") && idx > 0) {
    return (
      <span className={`visits-emp-card__visit-row${withDuty ? " visits-emp-card__visit-row--after-duty" : ""}`}>
        <span className="visits-emp-card__visit-label">Last visit</span>
        <span className="visits-emp-card__visit-value">{meta.detail.slice(idx + sep.length)}</span>
      </span>
    );
  }

  return <span className={visitClass}>{meta.detail}</span>;
}

export default function EmployeeActivityStrip({
  employees,
  selectedUserId,
  onSelectEmployee,
  onSelectAll,
  period = "today",
  dutyFetchedAtMs = null,
}) {
  const selected = String(selectedUserId || "");
  const showDuty = activityShowsDuty(period);
  const [tickNow, setTickNow] = useState(() => Date.now());

  useEffect(() => {
    if (!showDuty) return undefined;
    const hasOnDuty = (employees || []).some(
      (emp) => emp?.duty?.status === "ON_DUTY"
    );
    if (!hasOnDuty) return undefined;
    const id = window.setInterval(() => setTickNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [showDuty, employees]);

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
          const meta = employeeActivityMeta(emp, period);
          const dutyPresentation = showDuty
            ? employeeDutyPresentation(emp?.duty, {
                period,
                fetchedAtMs: dutyFetchedAtMs,
                nowMs: tickNow,
              })
            : null;
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
            meta.zero ? "visits-emp-card--zero" : "visits-emp-card--active",
            userId ? "" : "visits-emp-card--disabled",
            showDuty ? "visits-emp-card--with-duty" : "",
          ]
            .filter(Boolean)
            .join(" ");

          const body = (
            <>
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
              {dutyPresentation ? (
                <span className="visits-emp-duty">
                  <DutyStatusLine presentation={dutyPresentation} />
                  <DutyRows presentation={dutyPresentation} />
                </span>
              ) : null}
              <VisitDetailLine meta={meta} withDuty={Boolean(dutyPresentation)} />
            </>
          );

          if (!userId) {
            return (
              <div key={key} className={className}>
                {body}
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
              {body}
            </button>
          );
        })}
      </div>
    </div>
  );
}
