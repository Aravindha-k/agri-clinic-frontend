import ChartContainer from "../ui/ChartContainer";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function ReportsRouteChart({ data = [] }) {
  if (!data.length) {
    return (
      <p className="text-sm text-gray-500 text-center py-8">No route trend data for selected period.</p>
    );
  }

  return (
    <ChartContainer>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#9CA3AF" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
            unit=" km"
          />
          <Tooltip
            formatter={(v) => [`${Number(v).toFixed(1)} km`, "Distance"]}
            contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
          />
          <Bar dataKey="km" fill="#2563eb" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
