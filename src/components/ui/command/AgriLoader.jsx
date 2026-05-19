import { Sprout, Leaf } from "lucide-react";

/**
 * Agriculture-themed loader — sprout + leaves on a soft field ring.
 */
export default function AgriLoader({
  label = "Loading…",
  size = "md",
  className = "",
}) {
  return (
    <div
      className={`agri-loader agri-loader--${size} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="agri-loader__scene" aria-hidden="true">
        <div className="agri-loader__orbit">
          <Leaf className="agri-loader__orbit-leaf agri-loader__orbit-leaf--a" strokeWidth={2} />
          <Leaf className="agri-loader__orbit-leaf agri-loader__orbit-leaf--b" strokeWidth={2} />
        </div>
        <div className="agri-loader__ring">
          <div className="agri-loader__soil" />
          <Sprout className="agri-loader__sprout" strokeWidth={2.25} />
        </div>
      </div>
      {label ? <p className="agri-loader__label">{label}</p> : null}
    </div>
  );
}

export function PageLoader({ label = "Loading…", className = "" }) {
  return (
    <div className={`page-loader page-loader--agri ${className}`.trim()}>
      <AgriLoader label={label} size="lg" />
    </div>
  );
}
