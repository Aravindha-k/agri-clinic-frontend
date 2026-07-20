import { BRAND } from "../../theme/brand";

export default function Card({ title, value, icon: Icon, accent = BRAND.primary }) {
  return (
    <div className="enterprise-kpi-card card-hover" style={{ background: `linear-gradient(135deg, #fff 0%, ${accent}08 100%)` }}>
      <div className="enterprise-kpi-card__accent" style={{ background: accent }} aria-hidden="true" />
      <div className="enterprise-kpi-card__glow" style={{ background: accent }} aria-hidden="true" />
      <div className="mini-kpi-icon" style={{ background: `${accent}18`, color: accent }}>
        {Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
      </div>
      <p className="mini-kpi-value">{value}</p>
      <p className="mini-kpi-label">{title}</p>
    </div>
  );
}
