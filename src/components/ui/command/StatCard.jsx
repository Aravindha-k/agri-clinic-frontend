import { useEffect, useRef, useState } from "react";

function useCountUp(target, duration = 1100) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const end = Number(target) || 0;
    if (start === end) {
      setVal(end);
      return;
    }
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(start + (end - start) * ease));
      if (p < 1) requestAnimationFrame(step);
      else prev.current = end;
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

import { BRAND } from "../../../theme/brand";

export default function StatCard({
  icon: Icon,
  label,
  value,
  gradient = "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
  iconBg = "#dcfce7",
  iconColor = BRAND.primary,
  onClick,
  subValue,
  className = "",
}) {
  const animVal = useCountUp(value);
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      className={`kpi-card group ${onClick ? "cursor-pointer" : "cursor-default"} ${className}`}
      style={{ background: gradient }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-md"
        style={{ background: iconColor }}
      />
      {Icon && (
        <div className="kpi-card__icon" style={{ background: iconBg, color: iconColor }}>
          <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
        </div>
      )}
      <div className="relative z-10 min-w-0 flex-1">
        <p className="kpi-card__value">{animVal}</p>
        <p className="kpi-card__label truncate">{label}</p>
        {subValue && (
          <p className="kpi-card__sub truncate" style={{ color: iconColor }}>
            {subValue}
          </p>
        )}
      </div>
    </div>
  );
}
