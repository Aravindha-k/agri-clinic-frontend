import { CHART_COLORS } from "../../theme/brand";
import ChartContainer from "../ui/ChartContainer";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Label } from "recharts";

function RouteChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const km = Number(payload[0]?.value ?? 0);
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-100 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 mb-0.5">{label}</p>
      <p className="font-medium text-indigo-700">{km.toFixed(1)} km Distance Travelled</p>
    </div>
  );
}

export default function ReportsRouteChart({ data = [] }) {
  if (!data.length) {
    return (
      <p className="text-sm text-gray-500 text-center py-8">
        No route distance data for employees tracked today.
      </p>
    );
  }

  return (
    <div title="Distance travelled today by each field employee with active GPS routes">
      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
        Route distance by employee (today)
      </p>
      <ChartContainer>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#9CA3AF" }}
            >
              <Label value="Employee" offset={-2} position="insideBottom" style={{ fontSize: 10, fill: "#9CA3AF" }} />
            </XAxis>
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              unit=" km"
            >
              <Label
                value="Distance Travelled"
                angle={-90}
                position="insideLeft"
                style={{ fontSize: 10, fill: "#9CA3AF", textAnchor: "middle" }}
              />
            </YAxis>
            <Tooltip content={<RouteChartTooltip />} />
            <Bar dataKey="km" name="Distance Travelled" fill={CHART_COLORS.routeBar} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
