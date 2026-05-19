import fs from "fs";

const path = new URL("../src/pages/Tracking.jsx", import.meta.url);
let file = fs.readFileSync(path, "utf8");

if (!file.includes("MapBasemapLayers") || file.includes('activeTab === "route"')) {
  file = file.replace(
    '<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />',
    "<MapBasemapLayers />"
  );

  const popupOld = `                                                                        <Popup>
                                                                            <span className="text-xs font-semibold">
                                                                                {i === 0 ? "Start" : "Latest"} \\u2014 {p.timestamp || p.time || ""}
                                                                            </span>
                                                                        </Popup>`;

  const popupNew = `                                                                        <Popup>
                                                                            <EmployeeMapPopup
                                                                                name={i === 0 ? "Route start" : "Latest position"}
                                                                                lat={p.latitude || p.lat}
                                                                                lng={p.longitude || p.lng}
                                                                                entity={p}
                                                                                lastUpdated={p.timestamp || p.time || ""}
                                                                            />
                                                                        </Popup>`;

  if (file.includes(popupOld)) {
    file = file.replace(popupOld, popupNew);
  }

  fs.writeFileSync(path, file);
  console.log("Patched route map basemap + popups");
} else {
  console.log("Route map already patched or pattern missing");
}
