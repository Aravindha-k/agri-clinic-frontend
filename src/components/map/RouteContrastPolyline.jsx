import { Polyline } from "react-leaflet";

const ROUTE_COLOR = "#22c55e";
const ROUTE_OUTLINE = "#ffffff";

/**
 * High-contrast route polyline (visible on satellite and street basemaps).
 * @param {{ positions: [number, number][], color?: string, weight?: number }} props
 */
export default function RouteContrastPolyline({
  positions,
  color = ROUTE_COLOR,
  weight = 5,
}) {
  if (!positions || positions.length < 2) return null;

  return (
    <>
      <Polyline
        positions={positions}
        pathOptions={{
          color: ROUTE_OUTLINE,
          weight: weight + 4,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
        }}
      />
      <Polyline
        positions={positions}
        pathOptions={{
          color,
          weight,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
        }}
      />
    </>
  );
}
