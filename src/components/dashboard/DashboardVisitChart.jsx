import ChartContainer from "../ui/ChartContainer";
import { AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { Calendar } from "lucide-react";

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-100 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 mb-0.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }) {
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
    </div>
  );
}

export default function DashboardVisitChart({ visitTrends = [] }) {
  const trends = Array.isArray(visitTrends) ? visitTrends : [];
  return (
    <div
      className="section-card overflow-hidden"
      style={{
        boxShadow:
          "0 0 0 1px rgba(15,118,110,0.06), 0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)",
        border: "1px solid rgba(15,118,110,0.08)",
      }}
    >
      <SectionHeader icon={Calendar} title="Visit Activity" subtitle="Daily visits (last 30 days)" />
      <div className="px-3 py-3">
        {trends.length === 0 ? (
          <div className="flex flex-col items-center justify-center w-full min-w-0 h-[300px] text-gray-400">
            <Calendar className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">No visit trend data yet</p>
          </div>
        ) : (
          <ChartContainer>
            <AreaChart data={trends} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="visitTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#15803d" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#15803d" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#9CA3AF" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#9CA3AF" }}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                name="Visits"
                stroke="#15803d"
                strokeWidth={2.5}
                fill="url(#visitTrendGrad)"
                dot={{ r: 3, fill: "#15803d", stroke: "#fff", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: "#15803d", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
