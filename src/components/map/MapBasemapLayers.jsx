import { LayerGroup, LayersControl, TileLayer } from "react-leaflet";

const ESRI_WORLD_IMAGERY =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const ESRI_REFERENCE_LABELS =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

const OSM_STREET = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

/**
 * Satellite (hybrid labels) + street basemap toggle for admin maps.
 */
export default function MapBasemapLayers() {
  return (
    <LayersControl position="topright">
      <LayersControl.BaseLayer checked name="Satellite">
        <LayerGroup>
          <TileLayer
            url={ESRI_WORLD_IMAGERY}
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            maxZoom={19}
          />
          <TileLayer
            url={ESRI_REFERENCE_LABELS}
            attribution=""
            maxZoom={19}
            opacity={0.85}
          />
        </LayerGroup>
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer name="Street">
        <TileLayer
          url={OSM_STREET}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />
      </LayersControl.BaseLayer>
    </LayersControl>
  );
}
