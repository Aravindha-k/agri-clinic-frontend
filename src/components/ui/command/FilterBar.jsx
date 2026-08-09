/**
 * Shared list filter toolbar primitives.
 * Use FilterField for labeled/select controls; spacer aligns unlabeled search/buttons.
 */
export default function FilterBar({ children, className = "" }) {
  return <div className={`filters-bar filter-toolbar ${className}`.trim()}>{children}</div>;
}

export function FilterField({ label, children, className = "", spacer = false }) {
  const showSpacer = spacer || !label;
  return (
    <div className={`filter-field ${className}`.trim()}>
      {showSpacer ? (
        <span className="filter-field__label filter-field__label--spacer" aria-hidden="true">
          &nbsp;
        </span>
      ) : (
        <label className="filter-field__label">{label}</label>
      )}
      <div className="filter-field__control">{children}</div>
    </div>
  );
}

export function FilterToolbarRow({ children, className = "" }) {
  return <div className={`filter-toolbar__row ${className}`.trim()}>{children}</div>;
}

export function FilterActiveRow({ children, className = "", label = "Active" }) {
  if (!children) return null;
  return (
    <div className={`filter-toolbar__active ${className}`.trim()}>
      <span className="filter-toolbar__active-label">{label}</span>
      {children}
    </div>
  );
}
