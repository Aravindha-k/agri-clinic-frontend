import { useMemo } from "react";
import { CHART_COLORS } from "../../theme/brand";
import ChartContainer from "../ui/ChartContainer";
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Calendar, TrendingUp } from "lucide-react";
import { EmptyState } from "../ui/command";

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const visits = payload[0]?.value ?? 0;
  return (
    <div className="dashboard-chart-tooltip">
      <p className="dashboard-chart-tooltip__label">{label}</p>
      <p className="dashboard-chart-tooltip__value">
        {visits} visit{visits === 1 ? "" : "s"} completed
      </p>
      <p className="dashboard-chart-tooltip__hint">Daily field visit count</p>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, right }) {
  return (
    <div className="section-card-header">
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <div className="icon-box">
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="section-title">{title}</h3>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

export default function DashboardVisitChart({ visitTrends = [] }) {
  const trends = Array.isArray(visitTrends) ? visitTrends : [];
  const totalVisits = useMemo(
    () => trends.reduce((sum, row) => sum + (Number(row.count) || 0), 0),
    [trends]
  );
  const peakDay = useMemo(() => {
    if (!trends.length) return null;
    return trends.reduce((best, row) =>
      (Number(row.count) || 0) > (Number(best.count) || 0) ? row : best
    );
  }, [trends]);

  return (
    <div className="dashboard-chart">
      <SectionHeader
        icon={Calendar}
        title="Visit Activity"
        subtitle="Field visits completed each day (last 30 days)"
        right={
          trends.length > 0 ? (
            <span className="dashboard-chart__summary">
              <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
              {totalVisits} total
            </span>
          ) : null
        }
      />
      <div className="dashboard-chart__body">
        {trends.length > 0 && (
          <div className="dashboard-chart__meta">
            <div className="dashboard-chart__legend">
              <span className="dashboard-chart__legend-item">
                <span className="dashboard-chart__legend-dot" aria-hidden="true" />
                Visits completed
              </span>
              {peakDay && (
                <span className="text-slate-400">
                  Peak: {peakDay.label} ({peakDay.count})
                </span>
              )}
            </div>
          </div>
        )}
        {trends.length === 0 ? (
          <div className="dashboard-chart__empty">
            <EmptyState
              icon={Calendar}
              title="No visit trend data yet"
              subtitle="Daily visit analytics will appear once field visits are recorded."
              className="py-8"
            />
          </div>
        ) : (
          <ChartContainer>
            <AreaChart data={trends} margin={{ top: 12, right: 12, bottom: 4, left: -12 }}>
              <defs>
                <linearGradient id="visitTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={CHART_COLORS.grid}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                allowDecimals={false}
                width={36}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART_COLORS.primary, strokeOpacity: 0.15 }} />
              <Area
                type="monotone"
                dataKey="count"
                name="Visits Completed"
                stroke={CHART_COLORS.primary}
                strokeWidth={2.5}
                fill="url(#visitTrendGrad)"
                dot={{ r: 3, fill: CHART_COLORS.primary, stroke: "#fff", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: CHART_COLORS.primary, stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
