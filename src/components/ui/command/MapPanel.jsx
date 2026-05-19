import { Radio } from "lucide-react";

export function MapPanelHeader({
  icon: Icon,
  title,
  subtitle,
  live = false,
  right,
}) {
  return (
    <div className="section-card-header">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="icon-box">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="section-title">{title}</h3>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap justify-end">
        {right}
        {live && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100">
            <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-700 tracking-wide">LIVE</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MapPanel({
  icon,
  title,
  subtitle,
  live = false,
  right,
  height = 280,
  children,
  className = "",
  footer,
}) {
  return (
    <div className={`section-card overflow-hidden command-map-panel ${className}`}>
      <MapPanelHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        live={live}
        right={right}
      />
      <div className="relative command-map-body" style={{ height }}>
        <div className="absolute top-0 left-0 right-0 h-10 z-[400] pointer-events-none bg-gradient-to-b from-white/70 to-transparent" />
        {children}
      </div>
      {footer && (
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
          {footer}
        </div>
      )}
    </div>
  );
}
