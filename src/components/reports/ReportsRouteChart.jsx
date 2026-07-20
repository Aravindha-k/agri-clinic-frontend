import { CHART_COLORS } from "../../theme/brand";
import ChartContainer from "../ui/ChartContainer";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Label, CartesianGrid } from "recharts";

function RouteChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const km = Number(payload[0]?.value ?? 0);
  return (
    <div className="reports-bi-chart-tooltip">
      <p className="font-semibold text-slate-700 mb-0.5">{label}</p>
      <p className="font-medium text-indigo-700">{km.toFixed(1)} km distance travelled</p>
    </div>
  );
}

export default function ReportsRouteChart({ data = [] }) {
  if (!data.length) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">
        No route distance data for employees tracked today.
      </p>
    );
  }

  return (
    <div className="reports-bi-chart" title="Distance travelled today by each field employee with active GPS routes">
      <p className="reports-bi-chart__title">Route distance by employee (today)</p>
      <ChartContainer>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.2)" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
            >
              <Label value="Employee" offset={-2} position="insideBottom" style={{ fontSize: 10, fill: "#94a3b8" }} />
            </XAxis>
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#64748b" }}
              unit=" km"
            >
              <Label
                value="Distance"
                angle={-90}
                position="insideLeft"
                style={{ fontSize: 10, fill: "#94a3b8", textAnchor: "middle" }}
              />
            </YAxis>
            <Tooltip content={<RouteChartTooltip />} cursor={{ fill: "rgba(99, 102, 241, 0.06)" }} />
            <Bar dataKey="km" name="Distance Travelled" fill={CHART_COLORS.routeBar} radius={[8, 8, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
