import ChartContainer from "../ui/ChartContainer";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { CHART_COLORS } from "../../theme/brand";

export default function FarmerVisitTrendChart({ data = [] }) {
  if (!data.length) {
    return (
      <p className="text-sm text-gray-500 text-center py-8">Visit trend appears after multiple field visits.</p>
    );
  }

  return (
    <ChartContainer>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="farmerVisitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.25} />
              <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: CHART_COLORS.axis }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: CHART_COLORS.axis }} allowDecimals={false} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="count"
            name="Visits"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            fill="url(#farmerVisitGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
