import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { BRAND } from "../../theme/brand";

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

const TREND_STYLES = {
  up: {
    wrap: "premium-kpi__trend--up",
    Icon: ArrowUpRight,
  },
  down: {
    wrap: "premium-kpi__trend--down",
    Icon: ArrowDownRight,
  },
  neutral: {
    wrap: "premium-kpi__trend--neutral",
    Icon: Minus,
  },
};

export default function PremiumKpiCard({
  icon: Icon,
  label,
  value,
  gradient = "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
  iconBg = "#dcfce7",
  iconColor = BRAND.primary,
  onClick,
  subValue,
  trend,
  className = "",
  loading = false,
}) {
  const animVal = useCountUp(loading ? 0 : value);
  const trendCfg = trend ? TREND_STYLES[trend.direction] ?? TREND_STYLES.neutral : null;
  const TrendIcon = trendCfg?.Icon;

  if (loading) {
    return (
      <div className={`premium-kpi premium-kpi--loading ${className}`} style={{ background: gradient }} aria-busy="true" aria-label={`Loading ${label}`}>
        <div className="premium-kpi__top">
          <div className="premium-kpi__icon-wrap skeleton !rounded-2xl" />
          <div className="skeleton h-5 w-14 rounded-full" />
        </div>
        <div className="premium-kpi__content space-y-2">
          <div className="skeleton h-8 w-16 rounded-lg" />
          <div className="skeleton h-3 w-24 rounded" />
          {subValue && <div className="skeleton h-2.5 w-20 rounded" />}
        </div>
      </div>
    );
  }

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      className={`premium-kpi group ${onClick ? "premium-kpi--clickable" : ""} ${className}`}
      style={{ background: gradient, "--kpi-accent": iconColor }}
    >
      <div className="premium-kpi__glow" aria-hidden="true" />
      <div className="premium-kpi__top">
        <div className="premium-kpi__icon-wrap" style={{ background: iconBg, color: iconColor }}>
          {Icon && <Icon className="w-[18px] h-[18px]" strokeWidth={2.25} />}
        </div>
        {trend && trendCfg && TrendIcon && (
          <span className={`premium-kpi__trend ${trendCfg.wrap}`}>
            <TrendIcon className="w-3 h-3" strokeWidth={2.5} />
            {trend.text}
          </span>
        )}
      </div>
      <div className="premium-kpi__content">
        <p className="premium-kpi__value">{animVal}</p>
        <p className="premium-kpi__label">{label}</p>
        {subValue && <p className="premium-kpi__sub">{subValue}</p>}
      </div>
    </div>
  );
}
