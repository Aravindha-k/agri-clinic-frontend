import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, "../src/pages/Tracking.jsx");
let file = fs.readFileSync(filePath, "utf8");

const re =
  /<Popup>\s*<div className="min-w-\[200px\] p-1">[\s\S]*?<\/Popup>\s*(?=<\/Marker>)/;

const replacement = `<Popup>
                                            <EmployeeMapPopup
                                                name={empName(emp)}
                                                lat={emp.latitude ?? emp.last_latitude}
                                                lng={emp.longitude ?? emp.last_longitude}
                                                entity={emp}
                                                statusLabel={
                                                    String(
                                                        emp.connection_status ??
                                                            emp.connection ??
                                                            ""
                                                    ).toUpperCase() === "ONLINE"
                                                        ? "Online"
                                                        : "Offline"
                                                }
                                                statusOnline={
                                                    String(
                                                        emp.connection_status ??
                                                            emp.connection ??
                                                            ""
                                                    ).toUpperCase() === "ONLINE"
                                                }
                                                lastUpdated={timeAgo(emp.last_seen) || "\\u2014"}
                                            >
                                                {emp.is_suspicious ? (
                                                    <p className="flex items-center gap-1 text-[10px] text-red-600 font-medium">
                                                        <ShieldAlert className="w-3 h-3" />
                                                        Suspicious activity
                                                    </p>
                                                ) : null}
                                                {emp.work_status ? (
                                                    <p className="text-[10px] text-gray-500">
                                                        Work:{" "}
                                                        <span className="font-medium text-gray-700">
                                                            {emp.work_status}
                                                        </span>
                                                    </p>
                                                ) : null}
                                            </EmployeeMapPopup>
                                        </Popup>
                                    `;

if (!re.test(file)) {
  console.error("Popup block not found");
  process.exit(1);
}

file = file.replace(re, replacement);
fs.writeFileSync(filePath, file);
console.log("Patched Tracking.jsx live map popup");
