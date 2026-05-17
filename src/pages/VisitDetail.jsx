import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import { getVisitDetail, updateVisit } from "../api/visit.api";
import { GpsIndicator } from "../components/ui/command";
import { resolveVisitFarmer, visitLandLabel } from "../utils/visitFarmer";
import { asDisplayString, resolveLandLabel } from "../utils/displayValue";
import { unwrapSuccessEnvelope } from "../utils/apiUnwrap";
import {
    ArrowLeft,
    User,
    MapPin,
    Leaf,
    Calendar,
    LandPlot,
    FileText,
    Phone,
    Briefcase,
    Navigation,
    CheckCircle2,
    Clock,
    AlertCircle,
    ExternalLink,
} from "lucide-react";

const visitMarkerIcon = L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:50%;background:#059669;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
});

const fmtDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const fmtTime = (d) => {
    if (!d) return null;
    if (typeof d === "string" && /^\d{2}:\d{2}/.test(d)) return d.slice(0, 5);
    const parsed = new Date(d);
    if (Number.isNaN(parsed.getTime())) return String(d);
    return parsed.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

const parseCoord = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

const Card = ({ title, icon: Icon, children, className = "" }) => (
    <div
        className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}
    >
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white flex items-center gap-2.5">
            {Icon && (
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
                    <Icon className="w-4 h-4" />
                </div>
            )}
            <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        </div>
        <div className="p-5">{children}</div>
    </div>
);

const InfoItem = ({ label, value }) => (
    <div>
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="mt-1 text-sm font-medium text-gray-900 break-words">{asDisplayString(value)}</p>
    </div>
);

const Field = ({ label, value, editable, onChange, name, type = "text" }) => (
    <div>
        <label className="text-xs text-gray-400">{label}</label>
        {editable ? (
            type === "textarea" ? (
                <textarea
                    name={name}
                    value={value || ""}
                    onChange={onChange}
                    rows={3}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
            ) : (
                <input
                    type={type}
                    name={name}
                    value={value || ""}
                    onChange={onChange}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
            )
        ) : (
            <p className="mt-1 text-sm font-medium text-gray-800">{value || "—"}</p>
        )}
    </div>
);

function VisitLocationMap({ lat, lng }) {
    return (
        <div className="rounded-xl overflow-hidden border border-emerald-100" style={{ height: 200 }}>
            <MapContainer
                center={[lat, lng]}
                zoom={15}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={false}
                dragging={true}
            >
                <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[lat, lng]} icon={visitMarkerIcon} />
            </MapContainer>
        </div>
    );
}

function resolveVisitPayload(res) {
    const raw = unwrapSuccessEnvelope(res) ?? res;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    return raw;
}

function getEmployeeBlock(v) {
    const emp = v?.employee;
    const name =
        v?.employee_name ||
        (emp?.first_name && emp?.last_name
            ? `${emp.first_name} ${emp.last_name}`.trim()
            : null) ||
        emp?.first_name ||
        emp?.username ||
        "—";
    const employeeId =
        emp?.employee_id ??
        emp?.profile?.employee_id ??
        (emp?.id != null ? String(emp.id) : null);
    const role = emp?.is_staff
        ? "Admin"
        : emp?.role ||
          (emp?.employee_profile?.designation ? emp.employee_profile.designation : null) ||
          (employeeId ? "Field Agent" : null);
    return { name, employeeId, role, phone: v?.employee_phone || emp?.phone };
}

function getFarmerBlock(v) {
    const resolved = resolveVisitFarmer(v);
    const f = v?.farmer ?? v?.farmer_info;
    return {
        name: resolved.name,
        phone: resolved.phone,
        village: resolved.village,
        district: resolved.district,
        code: f?.farmer_code,
    };
}

function getFieldBlock(v) {
    const field = v?.field ?? v?.field_info ?? v?.land;
    const landLabel = visitLandLabel(v);
    const landName =
        resolveLandLabel(v?.land, "") ||
        field?.land_name ||
        v?.land_name ||
        (landLabel !== "—" ? landLabel.split(" · ")[0] : "—");
    const landArea =
        (typeof field === "object" && field
            ? field.land_size ?? field.land_area
            : null) ??
        v?.land_area ??
        "—";
    return {
        landName: landName || "—",
        landArea: landArea === "—" ? "—" : String(landArea),
        gps: field?.gps_location,
    };
}

function getCropBlock(v) {
    const resolved = resolveVisitFarmer(v);
    const crop = v?.crop_info ?? v?.crop;
    const name =
        resolved.cropName !== "—"
            ? resolved.cropName
            : crop?.name_en ?? crop?.name ?? (typeof crop === "string" ? crop : null) ?? "—";
    return {
        name,
        stage: v?.crop_stage ?? "—",
        health: v?.crop_health,
    };
}

export default function VisitDetail(props) {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const mode =
        props.mode || (location.pathname.endsWith("/edit") ? "edit" : "view");

    const [data, setData] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!id || id === "create") return;
        const fetch = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await getVisitDetail(id);
                const d = resolveVisitPayload(res);
                if (!d) {
                    setError("Visit not found");
                    setData(null);
                    return;
                }
                setData(d);
                setFormData(d);
            } catch {
                setError("Failed to load visit details");
                setData(null);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((p) => ({ ...p, [name]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await updateVisit(id, formData);
            navigate(`/visits/${id}`);
        } catch {
            setError("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    const v = mode === "edit" ? formData : data;

    const coords = useMemo(() => {
        const lat = parseCoord(v?.latitude);
        const lng = parseCoord(v?.longitude);
        if (lat == null || lng == null) return null;
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
        return { lat, lng };
    }, [v?.latitude, v?.longitude]);

    const hasGps = coords != null;
    const employee = getEmployeeBlock(v);
    const farmer = getFarmerBlock(v);
    const field = getFieldBlock(v);
    const crop = getCropBlock(v);

    const mapsUrl = hasGps
        ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
        : null;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[320px]">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mx-auto" />
                    <p className="mt-3 text-sm text-gray-500">Loading visit…</p>
                </div>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="p-8 text-center">
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <p className="text-red-600 font-medium">{error}</p>
                <button
                    onClick={() => navigate("/visits")}
                    className="mt-4 text-sm text-emerald-700 font-semibold hover:underline"
                >
                    Back to visits
                </button>
            </div>
        );
    }

    if (!data || Object.keys(data).length === 0) {
        return (
            <div className="p-8 text-center text-gray-500">
                No visit data found.
            </div>
        );
    }

    return (
        <div className="page-container space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                    <button
                        type="button"
                        onClick={() => navigate("/visits")}
                        className="p-2.5 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                        aria-label="Back"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-bold text-gray-900">
                                Visit #{v?.id ?? id}
                            </h1>
                            {hasGps && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3" />
                                    GPS on file
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {fmtDate(v?.visit_date ?? v?.created_at)}
                            {v?.visit_time ? ` · ${fmtTime(v.visit_time)}` : ""}
                        </p>
                    </div>
                </div>

                {mode === "view" ? (
                    <button
                        type="button"
                        onClick={() => navigate(`/visits/${id}/edit`)}
                        className="btn btn-primary btn-md self-start"
                    >
                        Edit visit
                    </button>
                ) : (
                    <div className="flex gap-2 self-start">
                        <button
                            type="button"
                            onClick={() => navigate(`/visits/${id}`)}
                            className="btn btn-secondary btn-md"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="btn btn-primary btn-md disabled:opacity-60"
                        >
                            {saving ? "Saving…" : "Save"}
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <div className="alert-error flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main column */}
                <div className="lg:col-span-2 space-y-6">
                    <Card title="Employee Information" icon={Briefcase}>
                        {mode === "edit" ? (
                            <p className="text-sm text-gray-500">
                                Assigned agent: {employee.name}
                                {employee.employeeId ? ` (${employee.employeeId})` : ""}
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <InfoItem label="Name" value={employee.name} />
                                <InfoItem
                                    label="Employee ID"
                                    value={employee.employeeId}
                                />
                                <InfoItem label="Role" value={employee.role} />
                                {employee.phone && employee.phone !== "—" && (
                                    <InfoItem label="Phone" value={employee.phone} />
                                )}
                            </div>
                        )}
                    </Card>

                    <Card title="Visit Location" icon={MapPin}>
                        {mode === "edit" ? (
                            <div className="grid grid-cols-2 gap-4">
                                <Field
                                    label="Latitude"
                                    name="latitude"
                                    value={v?.latitude}
                                    editable
                                    onChange={handleChange}
                                />
                                <Field
                                    label="Longitude"
                                    name="longitude"
                                    value={v?.longitude}
                                    editable
                                    onChange={handleChange}
                                />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {hasGps ? (
                                    <>
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Navigation className="w-4 h-4 text-emerald-600" />
                                                <span className="font-mono text-gray-800">
                                                    {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                                                </span>
                                            </div>
                                            {mapsUrl && (
                                                <a
                                                    href={mapsUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                                                >
                                                    Open in Maps
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            )}
                                        </div>
                                        <VisitLocationMap lat={coords.lat} lng={coords.lng} />
                                        {hasGps && (
                                            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                                                GPS coordinates were captured for this visit and serve as field proof of location.
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-amber-900">
                                                No GPS coordinates recorded
                                            </p>
                                            <p className="text-xs text-amber-700 mt-1">
                                                This visit has no latitude/longitude on file. Mobile visits normally capture GPS at create or completion.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>

                    <Card title="Farmer" icon={User}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field
                                label="Name"
                                name="farmer_name"
                                value={farmer.name}
                                editable={mode === "edit"}
                                onChange={handleChange}
                            />
                            <Field
                                label="Phone"
                                name="farmer_phone"
                                value={farmer.phone}
                                editable={mode === "edit"}
                                onChange={handleChange}
                            />
                            <Field
                                label="Village"
                                name="village_name"
                                value={farmer.village}
                                editable={mode === "edit"}
                                onChange={handleChange}
                            />
                            <Field
                                label="District"
                                name="district_name"
                                value={farmer.district}
                                editable={mode === "edit"}
                                onChange={handleChange}
                            />
                            {farmer.code && mode === "view" && (
                                <InfoItem label="Farmer code" value={farmer.code} />
                            )}
                        </div>
                    </Card>

                    <Card title="Field / Land" icon={LandPlot}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field
                                label="Land name"
                                name="land_name"
                                value={field.landName}
                                editable={mode === "edit"}
                                onChange={handleChange}
                            />
                            <Field
                                label="Area (acres)"
                                name="land_area"
                                value={field.landArea}
                                editable={mode === "edit"}
                                onChange={handleChange}
                            />
                            {field.gps && mode === "view" && (
                                <InfoItem label="Field GPS" value={field.gps} />
                            )}
                        </div>
                    </Card>

                    <Card title="Crop" icon={Leaf}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field
                                label="Crop"
                                name="crop_name"
                                value={crop.name}
                                editable={mode === "edit"}
                                onChange={handleChange}
                            />
                            <Field
                                label="Stage"
                                name="crop_stage"
                                value={crop.stage}
                                editable={mode === "edit"}
                                onChange={handleChange}
                            />
                            {crop.health && mode === "view" && (
                                <InfoItem label="Crop health" value={crop.health} />
                            )}
                        </div>
                    </Card>

                    <Card title="Notes & Recommendations" icon={FileText}>
                        <div className="space-y-4">
                            <Field
                                label="Visit notes"
                                name="notes"
                                value={v?.notes}
                                editable={mode === "edit"}
                                onChange={handleChange}
                                type="textarea"
                            />
                            <Field
                                label="Fertilizer advice"
                                name="fertilizer_advice"
                                value={v?.fertilizer_advice}
                                editable={mode === "edit"}
                                onChange={handleChange}
                                type="textarea"
                            />
                            <Field
                                label="Pesticide advice"
                                name="pesticide_advice"
                                value={v?.pesticide_advice}
                                editable={mode === "edit"}
                                onChange={handleChange}
                                type="textarea"
                            />
                            {(v?.irrigation_advice || v?.general_advice) && mode === "view" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-50">
                                    {v?.irrigation_advice && (
                                        <InfoItem label="Irrigation" value={v.irrigation_advice} />
                                    )}
                                    {v?.general_advice && (
                                        <InfoItem label="General advice" value={v.general_advice} />
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Sidebar: timeline */}
                <div className="space-y-6">
                    <Card title="Visit timeline" icon={Clock}>
                        <div className="space-y-4">
                            <ul className="space-y-3 border-l-2 border-emerald-100 pl-4 ml-1">
                                <li className="relative">
                                    <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                                    <p className="text-xs text-gray-400">Visit date</p>
                                    <p className="text-sm font-medium text-gray-900">
                                        {fmtDate(v?.visit_date ?? v?.created_at)}
                                        {v?.visit_time ? ` at ${fmtTime(v.visit_time)}` : ""}
                                    </p>
                                </li>
                                {v?.created_at && (
                                    <li className="relative">
                                        <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-gray-300 ring-2 ring-white" />
                                        <p className="text-xs text-gray-400">Recorded</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {fmtDate(v.created_at)}
                                        </p>
                                    </li>
                                )}
                                {v?.next_visit_date && (
                                    <li className="relative">
                                        <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-violet-400 ring-2 ring-white" />
                                        <p className="text-xs text-gray-400">Follow-up</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {fmtDate(v.next_visit_date)}
                                        </p>
                                    </li>
                                )}
                                {hasGps && (
                                    <li className="relative">
                                        <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
                                        <p className="text-xs text-gray-400">Location proof</p>
                                        <p className="text-sm font-medium text-gray-900 font-mono">
                                            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                                        </p>
                                    </li>
                                )}
                            </ul>

                            {v?.follow_up_required && (
                                <p className="text-xs font-medium text-violet-700 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
                                    Follow-up required
                                </p>
                            )}
                        </div>
                    </Card>

                    {employee.phone && employee.phone !== "—" && (
                        <Card title="Contact" icon={Phone}>
                            <InfoItem label="Agent phone" value={employee.phone} />
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

