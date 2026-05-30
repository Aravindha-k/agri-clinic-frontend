import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import { getVisitDetail, updateVisit } from "../api/visit.api";
import VisitEvidenceSection from "../components/visits/VisitEvidenceSection";
import VisitLocationDisplay from "../components/visits/VisitLocationDisplay";
import { resolveVisitAttachmentCount } from "../utils/visitAttachments";
import { GpsIndicator } from "../components/ui/command";
import { PageLoader } from "../components/ui/command";
import { resolveVisitFarmer, visitLandLabel, resolveVisitEmployeePhoto } from "../utils/visitFarmer";
import ProfileAvatar from "../components/ui/ProfileAvatar";
import { asDisplayString, resolveLandLabel } from "../utils/displayValue";
import {
    resolveVisitCropDisplay,
    resolveVisitFieldNotes,
    resolveVisitProblemSeen,
    resolveVisitActionTaken,
    resolveVisitFollowUpDate,
    VISIT_FIELD_NOTES_LABEL,
    VISIT_NOT_ADDED,
} from "../utils/visitDisplay";
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
    CheckCircle2,
    Clock,
    AlertCircle,
    Paperclip,
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
        className={`section-card overflow-hidden ${className}`}
    >
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white flex items-center gap-2">
            {Icon && (
                <div className="list-meta-icon list-meta-icon--crop">
                    <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                </div>
            )}
            <h2 className="text-xs font-semibold text-gray-800">{title}</h2>
        </div>
        <div className="panel-body">{children}</div>
    </div>
);

const InfoItem = ({ label, value, muted }) => (
    <div>
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
        <p
            className={`mt-1 text-sm font-medium break-words whitespace-pre-wrap ${
                muted ? "text-gray-400 italic" : "text-gray-900"
            }`}
        >
            {asDisplayString(value, VISIT_NOT_ADDED)}
        </p>
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
    return {
        name,
        employeeId,
        role,
        phone: v?.employee_phone || emp?.phone,
        photoUrl: resolveVisitEmployeePhoto(v),
        entity: emp,
    };
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
        photoUrl: resolved.profilePhotoUrl,
        entity: f ?? v,
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
    return {
        name: resolveVisitCropDisplay(v),
        stage: v?.crop_stage,
        health: v?.crop_health,
    };
}

function getVisitNotesBlock(v) {
    return {
        fieldNotes: resolveVisitFieldNotes(v),
        problemSeen: resolveVisitProblemSeen(v),
        actionTaken: resolveVisitActionTaken(v),
        followUpDate: resolveVisitFollowUpDate(v),
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
    const [evidenceCount, setEvidenceCount] = useState(null);

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
    const visitNotes = getVisitNotesBlock(v);

    const mapsUrl = hasGps
        ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
        : null;

    const headerAttachmentCount =
        evidenceCount ?? resolveVisitAttachmentCount(data);

    if (loading) {
        return (
            <div className="page-container">
                <PageLoader label="Loading visit…" />
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
                            {headerAttachmentCount != null && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                    <Paperclip className="w-3 h-3" />
                                    {headerAttachmentCount}{" "}
                                    {headerAttachmentCount === 1 ? "attachment" : "attachments"}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Main column */}
                <div className="lg:col-span-2 space-y-6">
                    <Card title="Employee Information" icon={Briefcase}>
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                            <ProfileAvatar entity={employee.entity} src={employee.photoUrl} name={employee.name} size="lg" />
                            <div>
                                <p className="text-sm font-semibold text-gray-900">{employee.name}</p>
                                {employee.role && <p className="text-xs text-gray-500">{employee.role}</p>}
                            </div>
                        </div>
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
                                    <VisitLocationDisplay
                                        visit={v}
                                        coords={coords}
                                        mapsUrl={mapsUrl}
                                        mapSlot={<VisitLocationMap lat={coords.lat} lng={coords.lng} />}
                                    />
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
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                            <ProfileAvatar entity={farmer.entity} src={farmer.photoUrl} name={farmer.name} size="lg" variant="teal" />
                            <div>
                                <p className="text-sm font-semibold text-gray-900">{farmer.name}</p>
                                {farmer.phone && farmer.phone !== "—" && (
                                    <p className="text-xs text-gray-500">{farmer.phone}</p>
                                )}
                            </div>
                        </div>
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
                            {mode === "edit" ? (
                                <Field
                                    label="Crop"
                                    name="crop_name"
                                    value={v?.crop_name ?? ""}
                                    editable
                                    onChange={handleChange}
                                />
                            ) : (
                                <InfoItem
                                    label="Crop"
                                    value={crop.name}
                                    muted={crop.name === VISIT_NOT_ADDED}
                                />
                            )}
                            <Field
                                label="Stage"
                                name="crop_stage"
                                value={crop.stage ?? ""}
                                editable={mode === "edit"}
                                onChange={handleChange}
                            />
                            {crop.health && mode === "view" && (
                                <InfoItem label="Crop health" value={crop.health} />
                            )}
                        </div>
                    </Card>

                    <Card title={VISIT_FIELD_NOTES_LABEL} icon={FileText}>
                        <div className="grid grid-cols-1 gap-4">
                            {mode === "edit" ? (
                                <>
                                    <Field
                                        label={VISIT_FIELD_NOTES_LABEL}
                                        name="field_notes"
                                        value={v?.field_notes ?? v?.observation ?? ""}
                                        editable
                                        onChange={handleChange}
                                        type="textarea"
                                    />
                                    <Field
                                        label="Problem Seen"
                                        name="problem_seen"
                                        value={v?.problem_seen ?? ""}
                                        editable
                                        onChange={handleChange}
                                        type="textarea"
                                    />
                                    <Field
                                        label="Action Taken"
                                        name="action_taken"
                                        value={v?.action_taken ?? ""}
                                        editable
                                        onChange={handleChange}
                                        type="textarea"
                                    />
                                    <Field
                                        label="Follow-up Date"
                                        name="next_visit_date"
                                        value={v?.next_visit_date ?? v?.follow_up_date ?? ""}
                                        editable
                                        onChange={handleChange}
                                        type="date"
                                    />
                                </>
                            ) : (
                                <>
                                    <InfoItem
                                        label={VISIT_FIELD_NOTES_LABEL}
                                        value={visitNotes.fieldNotes}
                                        muted={visitNotes.fieldNotes === VISIT_NOT_ADDED}
                                    />
                                    <InfoItem
                                        label="Problem Seen"
                                        value={visitNotes.problemSeen}
                                        muted={visitNotes.problemSeen === VISIT_NOT_ADDED}
                                    />
                                    <InfoItem
                                        label="Action Taken"
                                        value={visitNotes.actionTaken}
                                        muted={visitNotes.actionTaken === VISIT_NOT_ADDED}
                                    />
                                    <InfoItem
                                        label="Follow-up Date"
                                        value={visitNotes.followUpDate}
                                        muted={visitNotes.followUpDate === VISIT_NOT_ADDED}
                                    />
                                </>
                            )}
                        </div>
                    </Card>

                    {id && (
                        <VisitEvidenceSection
                            visitId={id}
                            onCountChange={setEvidenceCount}
                        />
                    )}
                </div>

                {/* Sidebar: timeline */}
                <div className="ops-page">
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
                                {visitNotes.followUpDate !== VISIT_NOT_ADDED && (
                                    <li className="relative">
                                        <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-violet-400 ring-2 ring-white" />
                                        <p className="text-xs text-gray-400">Follow-up Date</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {visitNotes.followUpDate}
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

