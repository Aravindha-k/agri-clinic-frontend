import ChartContainer from "../ui/ChartContainer";
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { CHART_COLORS } from "../../theme/brand";
import { TrendingUp } from "lucide-react";

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="dashboard-chart-tooltip">
      <p className="dashboard-chart-tooltip__label">{label}</p>
      <p className="dashboard-chart-tooltip__value">
        {payload[0]?.value ?? 0} visit{(payload[0]?.value ?? 0) === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export default function FarmerVisitTrendChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
        <TrendingUp className="w-8 h-8 text-slate-300 mb-2" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-500">No trend data yet</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Visit trend appears after multiple field visits are recorded.
        </p>
      </div>
    );
  }

  return (
    <ChartContainer>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="farmerVisitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.28} />
            <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: CHART_COLORS.axis }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: CHART_COLORS.axis }} allowDecimals={false} width={28} />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="count"
          name="Visits"
          stroke={CHART_COLORS.primary}
          strokeWidth={2.25}
          fill="url(#farmerVisitGrad)"
          dot={{ r: 2.5, fill: CHART_COLORS.primary, stroke: "#fff", strokeWidth: 1.5 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
