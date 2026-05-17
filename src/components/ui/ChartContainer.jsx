import { ResponsiveContainer } from "recharts";

/**
 * Fixed-size chart shell so Recharts never measures width/height as -1.
 */
export default function ChartContainer({ children, className = "", heightClass = "h-[300px]" }) {
  return (
    <div className={`w-full min-w-0 ${heightClass} ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
