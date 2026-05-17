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

export default function StatCard({
  icon: Icon,
  label,
  value,
  gradient = "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
  iconBg = "#dcfce7",
  iconColor = "#15803d",
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
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ background: iconColor }}
      />
      <div
        className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-[0.08] pointer-events-none"
        style={{ background: iconColor }}
      />
      <div className="relative z-10">
        {Icon && (
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-105"
            style={{ background: iconBg, color: iconColor }}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
        <p className="text-[28px] font-bold text-slate-900 leading-none tabular-nums tracking-tight">
          {animVal}
        </p>
        <p className="mt-1.5 text-[13px] text-slate-500 font-medium">{label}</p>
        {subValue && (
          <p className="mt-1 text-[11px] font-semibold" style={{ color: iconColor }}>
            {subValue}
          </p>
        )}
      </div>
    </div>
  );
}
