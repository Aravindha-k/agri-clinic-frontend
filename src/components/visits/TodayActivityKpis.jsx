import { ClipboardList, MapPin, UserX, Users } from "lucide-react";
import { gpsVerifiedPercent, todayActivityKpis } from "../../utils/visitsActivity";

const KPI_ICONS = {
  visits: ClipboardList,
  staff: Users,
  none: UserX,
  gps: MapPin,
};

const KPI_TONE = {
  visits: "visits-today-kpi--visits",
  staff: "visits-today-kpi--staff",
  none: "visits-today-kpi--none",
  gps: "visits-today-kpi--gps",
};

export function TodayActivityKpiSkeleton() {
  return (
    <div className="visits-today-kpis" aria-busy="true" aria-label="Loading today's field activity">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="visits-today-kpi visits-today-kpi--skeleton">
          <div className="skeleton h-3.5 w-24 rounded" />
          <div className="skeleton h-7 w-12 rounded mt-2" />
          <div className="skeleton h-3 w-28 rounded mt-2" />
        </div>
      ))}
    </div>
  );
}

export default function TodayActivityKpis({ summary, period = "today" }) {
  const kpis = todayActivityKpis(summary, period);
  const gpsFull =
    Number(summary?.total_visits) > 0 &&
    gpsVerifiedPercent(summary?.gps_verified, summary?.total_visits) === 100;

  return (
    <div className="visits-today-kpis">
      {kpis.map((kpi) => {
        const Icon = KPI_ICONS[kpi.id];
        const tone = KPI_TONE[kpi.id] || "";
        const gpsClass = kpi.id === "gps" && gpsFull ? "visits-today-kpi--gps-full" : "";
        return (
          <article key={kpi.id} className={`visits-today-kpi ${tone} ${gpsClass}`.trim()}>
            <div className="visits-today-kpi__head">
              {Icon ? <Icon className="visits-today-kpi__icon" aria-hidden="true" /> : null}
              <p className="visits-today-kpi__label">{kpi.label}</p>
            </div>
            <p className="visits-today-kpi__value">{kpi.value}</p>
            <p className="visits-today-kpi__hint">{kpi.hint}</p>
          </article>
        );
      })}
    </div>
  );
}
