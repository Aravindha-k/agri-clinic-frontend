/**
 * Vite-safe Leaflet defaults — default icon URLs break when assets are hashed.
 * Import once from AdminMapFrame (side effects).
 */
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const proto = L.Icon.Default.prototype;
if (typeof proto._getIconUrl === "function") {
  delete proto._getIconUrl;
}

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
