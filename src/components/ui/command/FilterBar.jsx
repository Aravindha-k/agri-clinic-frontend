export default function FilterBar({ children, className = "" }) {
  return <div className={`filters-bar ${className}`}>{children}</div>;
}

export function FilterField({ label, children, className = "" }) {
  return (
    <div className={`flex flex-col gap-1.5 min-w-[140px] ${className}`}>
      {label && <label className="form-label">{label}</label>}
      {children}
    </div>
  );
}
