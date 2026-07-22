import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getVisitDetail, updateVisit } from "../api/visit.api";
import VisitEvidenceSection from "../components/visits/VisitEvidenceSection";
import VisitLocationDisplay from "../components/visits/VisitLocationDisplay";
import { resolveVisitAttachmentCount } from "../utils/visitAttachments";
import ErrorRetry from "../components/ui/ErrorRetry";
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
    FileText,
    Phone,
    Briefcase,
    CheckCircle2,
    Clock,
    AlertCircle,
    Paperclip,
    AlertTriangle,
    Stethoscope,
    Pencil,
    ShieldCheck,
    Image as ImageIcon,
} from "lucide-react";

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

function ReportSection({ number, title, subtitle, icon: Icon, children }) {
    return (
        <section className="visit-report-section">
            <div className="visit-report-section__head">
                <span className="visit-report-section__number" aria-hidden="true">
                    {number}
                </span>
                <div className="visit-report-section__title-wrap">
                    <h2 className="visit-report-section__title">{title}</h2>
                    {subtitle ? (
                        <p className="visit-report-section__subtitle">{subtitle}</p>
                    ) : null}
                </div>
                {Icon ? (
                    <div className="visit-report-section__icon" aria-hidden="true">
                        <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                    </div>
                ) : null}
            </div>
            <div className="visit-report-section__body">{children}</div>
        </section>
    );
}

function ReportKv({ label, value, muted }) {
    return (
        <div className="visit-report-kv">
            <p className="visit-report-kv__label">{label}</p>
            <p className={`visit-report-kv__value ${muted ? "visit-report-kv__value--muted" : ""}`}>
                {asDisplayString(value, VISIT_NOT_ADDED)}
            </p>
        </div>
    );
}

function RecommendationCard({ label, value, tone, icon: Icon, muted }) {
    return (
        <div className={`visit-report-rec visit-report-rec--${tone}`}>
            <p className="visit-report-rec__label">
                {Icon ? <Icon className="w-3.5 h-3.5" aria-hidden="true" /> : null}
                {label}
            </p>
            <p className={`visit-report-rec__body ${muted ? "visit-report-rec__body--muted" : ""}`}>
                {asDisplayString(value, VISIT_NOT_ADDED)}
            </p>
        </div>
    );
}

function VisitDetailSkeleton() {
    return (
        <div className="visit-report" aria-busy="true" aria-label="Loading visit report">
            <div className="visit-report-header p-5 space-y-3">
                <div className="skeleton h-5 w-40 rounded-md" />
                <div className="skeleton h-8 w-56 rounded-lg" />
                <div className="skeleton h-4 w-32 rounded" />
            </div>
            <div className="visit-report-skeleton-summary" />
            <div className="visit-report-layout">
                <div className="visit-report-main space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="visit-report-section p-5 space-y-3">
                            <div className="skeleton h-4 w-48 rounded" />
                            <div className="skeleton h-20 w-full rounded-xl" />
                        </div>
                    ))}
                </div>
                <div className="visit-report-sidebar">
                    <div className="visit-report-section p-5 space-y-3">
                        <div className="skeleton h-4 w-28 rounded" />
                        <div className="skeleton h-32 w-full rounded-xl" />
                    </div>
                </div>
            </div>
        </div>
    );
}

const Field = ({ label, value, editable, onChange, name, type = "text" }) => (
    <div className="visit-report-field">
        <label htmlFor={editable ? name : undefined}>{label}</label>
        {editable ? (
            type === "textarea" ? (
                <textarea
                    id={name}
                    name={name}
                    value={value || ""}
                    onChange={onChange}
                    rows={4}
                />
            ) : (
                <input
                    id={name}
                    type={type}
                    name={name}
                    value={value || ""}
                    onChange={onChange}
                />
            )
        ) : (
            <p className="mt-1.5 text-sm font-semibold text-slate-900">{value || "—"}</p>
        )}
    </div>
);

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

function ReportActionButtons({ mode, id, saving, onSave, onCancel, onEdit }) {
    if (mode === "view") {
        return (
            <div className="visit-report-actions">
                <button type="button" onClick={onEdit} className="btn btn-primary btn-md">
                    <Pencil className="w-4 h-4" aria-hidden="true" />
                    Edit report
                </button>
            </div>
        );
    }

    return (
        <div className="visit-report-actions visit-report-actions--edit">
            <button type="button" onClick={onCancel} className="btn btn-secondary btn-md">
                Cancel
            </button>
            <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="btn btn-primary btn-md disabled:opacity-60"
            >
                {saving ? "Saving…" : "Save changes"}
            </button>
        </div>
    );
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

    const headerAttachmentCount =
        evidenceCount ?? resolveVisitAttachmentCount(data);

    const visitDateLabel = fmtDate(v?.visit_date ?? v?.created_at);
    const visitTimeLabel = v?.visit_time ? fmtTime(v.visit_time) : null;

    if (loading) {
        return <VisitDetailSkeleton />;
    }

    if (error && !data) {
        return (
            <div className="visit-report space-y-4">
                <ErrorRetry message={error} onRetry={() => navigate(0)} />
                <div className="text-center">
                    <button
                        type="button"
                        onClick={() => navigate("/visits")}
                        className="btn btn-secondary btn-md"
                    >
                        Back to visits
                    </button>
                </div>
            </div>
        );
    }

    if (!data || Object.keys(data).length === 0) {
        return (
            <div className="p-8 text-center text-slate-500">
                No visit data found.
            </div>
        );
    }

    return (
        <div className="visit-report">
            <header className="visit-report-header">
                <div className="visit-report-header__top">
                    <div className="visit-report-header__nav">
                        <button
                            type="button"
                            onClick={() => navigate("/visits")}
                            className="visits-detail-back"
                            aria-label="Back to visits"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <div className="min-w-0">
                            <span className="visit-report-header__badge">
                                <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                                Field inspection report
                            </span>
                            <h1 className="visit-report-header__title">Visit #{v?.id ?? id}</h1>
                            <p className="visit-report-header__meta">
                                <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                {visitDateLabel}
                                {visitTimeLabel ? ` · ${visitTimeLabel}` : ""}
                                {v?.created_at ? ` · Recorded ${fmtDate(v.created_at)}` : ""}
                            </p>
                        </div>
                    </div>

                    <ReportActionButtons
                        mode={mode}
                        id={id}
                        saving={saving}
                        onSave={handleSave}
                        onCancel={() => navigate(`/visits/${id}`)}
                        onEdit={() => navigate(`/visits/${id}/edit`)}
                    />
                </div>

                <div className="visit-report-header__chips">
                    {hasGps ? (
                        <span className="visits-status-chip visits-status-chip--gps">
                            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                            GPS verified
                        </span>
                    ) : (
                        <span className="visits-status-chip visits-status-chip--nogps">
                            <AlertCircle className="w-3 h-3" aria-hidden="true" />
                            No GPS on file
                        </span>
                    )}
                    {headerAttachmentCount != null && headerAttachmentCount > 0 && (
                        <span className="visits-status-chip visits-status-chip--evidence">
                            <Paperclip className="w-3 h-3" aria-hidden="true" />
                            {headerAttachmentCount}{" "}
                            {headerAttachmentCount === 1 ? "attachment" : "attachments"}
                        </span>
                    )}
                    {visitNotes.followUpDate !== VISIT_NOT_ADDED && (
                        <span className="visits-status-chip visits-status-chip--followup">
                            <Calendar className="w-3 h-3" aria-hidden="true" />
                            Follow-up {visitNotes.followUpDate}
                        </span>
                    )}
                    {v?.follow_up_required && (
                        <span className="visits-status-chip visits-status-chip--followup">
                            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                            Follow-up required
                        </span>
                    )}
                </div>
            </header>

            {error && (
                <div className="alert-error flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    {error}
                </div>
            )}

            <section className="visit-report-summary" aria-label="Visit summary">
                <div className="visit-report-summary__glow -top-8 -right-8 w-40 h-40" aria-hidden="true" />
                <div className="visit-report-summary__inner">
                    <p className="visit-report-summary__label">Inspection summary</p>
                    <div className="visit-report-summary__grid">
                        <div className="visit-report-summary__cell">
                            <p className="visit-report-summary__cell-label">Inspector</p>
                            <p className="visit-report-summary__cell-value">{employee.name}</p>
                        </div>
                        <div className="visit-report-summary__cell">
                            <p className="visit-report-summary__cell-label">Farmer</p>
                            <p className="visit-report-summary__cell-value">{farmer.name}</p>
                        </div>
                        <div className="visit-report-summary__cell">
                            <p className="visit-report-summary__cell-label">Crop</p>
                            <p className="visit-report-summary__cell-value">{crop.name}</p>
                        </div>
                        <div className="visit-report-summary__cell">
                            <p className="visit-report-summary__cell-label">Land</p>
                            <p className="visit-report-summary__cell-value">{field.landName}</p>
                        </div>
                        <div className="visit-report-summary__cell">
                            <p className="visit-report-summary__cell-label">GPS</p>
                            <p className="visit-report-summary__cell-value">
                                {hasGps ? "Verified" : "Missing"}
                            </p>
                        </div>
                        <div className="visit-report-summary__cell">
                            <p className="visit-report-summary__cell-label">Evidence</p>
                            <p className="visit-report-summary__cell-value">
                                {headerAttachmentCount ?? 0} file
                                {(headerAttachmentCount ?? 0) === 1 ? "" : "s"}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="visit-report-layout">
                <main className="visit-report-main">
                    <ReportSection
                        number="01"
                        title="Farmer & site"
                        subtitle="Subject profile, land parcel, and crop details"
                        icon={User}
                    >
                        <div className="visit-report-farmer">
                            <div className="visit-report-farmer__profile">
                                <ProfileAvatar
                                    entity={farmer.entity}
                                    src={farmer.photoUrl}
                                    name={farmer.name}
                                    size="lg"
                                    variant="teal"
                                />
                                <div className="min-w-0 mt-3">
                                    <p className="visit-report-farmer__name">{farmer.name}</p>
                                    {farmer.phone && farmer.phone !== "—" && (
                                        <p className="visit-report-farmer__phone">
                                            <Phone className="w-3 h-3" aria-hidden="true" />
                                            {farmer.phone}
                                        </p>
                                    )}
                                    {farmer.code && mode === "view" && (
                                        <span className="visit-report-farmer__code">
                                            {farmer.code}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="visit-report-farmer__details">
                                {mode === "edit" ? (
                                    <div className="visit-report-kv-grid">
                                        <Field
                                            label="Farmer name"
                                            name="farmer_name"
                                            value={farmer.name}
                                            editable
                                            onChange={handleChange}
                                        />
                                        <Field
                                            label="Phone"
                                            name="farmer_phone"
                                            value={farmer.phone}
                                            editable
                                            onChange={handleChange}
                                        />
                                        <Field
                                            label="Village"
                                            name="village_name"
                                            value={farmer.village}
                                            editable
                                            onChange={handleChange}
                                        />
                                        <Field
                                            label="District"
                                            name="district_name"
                                            value={farmer.district}
                                            editable
                                            onChange={handleChange}
                                        />
                                        <Field
                                            label="Land name"
                                            name="land_name"
                                            value={field.landName}
                                            editable
                                            onChange={handleChange}
                                        />
                                        <Field
                                            label="Area (acres)"
                                            name="land_area"
                                            value={field.landArea}
                                            editable
                                            onChange={handleChange}
                                        />
                                        <Field
                                            label="Crop"
                                            name="crop_name"
                                            value={v?.crop_name ?? ""}
                                            editable
                                            onChange={handleChange}
                                        />
                                        <Field
                                            label="Crop stage"
                                            name="crop_stage"
                                            value={crop.stage ?? ""}
                                            editable
                                            onChange={handleChange}
                                        />
                                    </div>
                                ) : (
                                    <div className="visit-report-kv-grid">
                                        <ReportKv label="Village" value={farmer.village} />
                                        <ReportKv label="District" value={farmer.district} />
                                        <ReportKv label="Land parcel" value={field.landName} />
                                        <ReportKv label="Area (acres)" value={field.landArea} />
                                        <ReportKv
                                            label="Crop"
                                            value={crop.name}
                                            muted={crop.name === VISIT_NOT_ADDED}
                                        />
                                        <ReportKv label="Crop stage" value={crop.stage} />
                                        {crop.health && (
                                            <ReportKv label="Crop health" value={crop.health} />
                                        )}
                                        {field.gps && (
                                            <ReportKv label="Field GPS" value={field.gps} />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </ReportSection>

                    <ReportSection
                        number="02"
                        title="Field notes"
                        subtitle="Observations recorded during the visit"
                        icon={FileText}
                    >
                        {mode === "edit" ? (
                            <Field
                                label={VISIT_FIELD_NOTES_LABEL}
                                name="field_notes"
                                value={v?.field_notes ?? v?.observation ?? ""}
                                editable
                                onChange={handleChange}
                                type="textarea"
                            />
                        ) : (
                            <div className="visit-report-notes">
                                <p className="visit-report-notes__label">
                                    <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                                    {VISIT_FIELD_NOTES_LABEL}
                                </p>
                                <p
                                    className={`visit-report-notes__body ${
                                        visitNotes.fieldNotes === VISIT_NOT_ADDED
                                            ? "visit-report-notes__body--muted"
                                            : ""
                                    }`}
                                >
                                    {asDisplayString(visitNotes.fieldNotes, VISIT_NOT_ADDED)}
                                </p>
                            </div>
                        )}
                    </ReportSection>

                    <ReportSection
                        number="03"
                        title="Recommendations"
                        subtitle="Problem identified, action taken, and follow-up plan"
                        icon={Stethoscope}
                    >
                        {mode === "edit" ? (
                            <div className="space-y-4">
                                <Field
                                    label="Problem seen"
                                    name="problem_seen"
                                    value={v?.problem_seen ?? ""}
                                    editable
                                    onChange={handleChange}
                                    type="textarea"
                                />
                                <Field
                                    label="Action taken"
                                    name="action_taken"
                                    value={v?.action_taken ?? ""}
                                    editable
                                    onChange={handleChange}
                                    type="textarea"
                                />
                                <Field
                                    label="Follow-up date"
                                    name="next_visit_date"
                                    value={v?.next_visit_date ?? v?.follow_up_date ?? ""}
                                    editable
                                    onChange={handleChange}
                                    type="date"
                                />
                            </div>
                        ) : (
                            <div className="visit-report-recommendations">
                                <RecommendationCard
                                    label="Problem seen"
                                    value={visitNotes.problemSeen}
                                    tone="problem"
                                    icon={AlertTriangle}
                                    muted={visitNotes.problemSeen === VISIT_NOT_ADDED}
                                />
                                <RecommendationCard
                                    label="Action taken"
                                    value={visitNotes.actionTaken}
                                    tone="action"
                                    icon={CheckCircle2}
                                    muted={visitNotes.actionTaken === VISIT_NOT_ADDED}
                                />
                                <RecommendationCard
                                    label="Follow-up date"
                                    value={visitNotes.followUpDate}
                                    tone="followup"
                                    icon={Calendar}
                                    muted={visitNotes.followUpDate === VISIT_NOT_ADDED}
                                />
                            </div>
                        )}
                    </ReportSection>

                    <ReportSection
                        number="04"
                        title="Location verification"
                        subtitle="GPS coordinates and map proof of field presence"
                        icon={MapPin}
                    >
                        {mode === "edit" ? (
                            <div className="visit-report-kv-grid">
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
                        ) : hasGps ? (
                            <VisitLocationDisplay visit={v} coords={coords} />
                        ) : (
                            <div className="visits-detail-alert visits-detail-alert--warning">
                                <AlertCircle
                                    className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
                                    aria-hidden="true"
                                />
                                <div>
                                    <p className="text-sm font-semibold text-amber-900">
                                        No GPS coordinates recorded
                                    </p>
                                    <p className="text-xs text-amber-700 mt-1">
                                        This visit has no latitude/longitude on file. Mobile visits
                                        normally capture GPS at create or completion.
                                    </p>
                                </div>
                            </div>
                        )}
                    </ReportSection>

                    {id && (
                        <ReportSection
                            number="05"
                            title="Photos & attachments"
                            subtitle="Photographic evidence and supporting documents"
                            icon={ImageIcon}
                        >
                            <VisitEvidenceSection
                                visitId={id}
                                onCountChange={setEvidenceCount}
                                variant="report"
                            />
                        </ReportSection>
                    )}
                </main>

                <aside className="visit-report-sidebar">
                    <section className="visit-report-timeline-card">
                        <div className="visit-report-section__head">
                            <span className="visit-report-section__number" aria-hidden="true">
                                <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />
                            </span>
                            <div className="visit-report-section__title-wrap">
                                <h2 className="visit-report-section__title">Inspection timeline</h2>
                                <p className="visit-report-section__subtitle">
                                    Key events for this report
                                </p>
                            </div>
                        </div>
                        <div className="visit-report-section__body">
                            <ul className="visit-report-timeline">
                                <li className="visit-report-timeline__item">
                                    <span
                                        className="visit-report-timeline__dot bg-emerald-500"
                                        aria-hidden="true"
                                    />
                                    <p className="visit-report-timeline__label">Visit conducted</p>
                                    <p className="visit-report-timeline__value">
                                        {visitDateLabel}
                                        {visitTimeLabel ? ` at ${visitTimeLabel}` : ""}
                                    </p>
                                </li>
                                {v?.created_at && (
                                    <li className="visit-report-timeline__item">
                                        <span
                                            className="visit-report-timeline__dot bg-slate-300"
                                            aria-hidden="true"
                                        />
                                        <p className="visit-report-timeline__label">Report recorded</p>
                                        <p className="visit-report-timeline__value">
                                            {fmtDate(v.created_at)}
                                        </p>
                                    </li>
                                )}
                                {visitNotes.followUpDate !== VISIT_NOT_ADDED && (
                                    <li className="visit-report-timeline__item">
                                        <span
                                            className="visit-report-timeline__dot bg-violet-400"
                                            aria-hidden="true"
                                        />
                                        <p className="visit-report-timeline__label">Follow-up due</p>
                                        <p className="visit-report-timeline__value">
                                            {visitNotes.followUpDate}
                                        </p>
                                    </li>
                                )}
                                {hasGps && (
                                    <li className="visit-report-timeline__item">
                                        <span
                                            className="visit-report-timeline__dot bg-emerald-400"
                                            aria-hidden="true"
                                        />
                                        <p className="visit-report-timeline__label">GPS captured</p>
                                        <p className="visit-report-timeline__value font-mono text-xs">
                                            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                                        </p>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </section>

                    <section className="visit-report-section">
                        <div className="visit-report-section__head">
                            <span className="visit-report-section__number" aria-hidden="true">
                                <Briefcase className="w-3.5 h-3.5" strokeWidth={2.5} />
                            </span>
                            <div className="visit-report-section__title-wrap">
                                <h2 className="visit-report-section__title">Conducted by</h2>
                            </div>
                        </div>
                        <div className="visit-report-section__body">
                            <div className="visit-report-inspector">
                                <ProfileAvatar
                                    entity={employee.entity}
                                    src={employee.photoUrl}
                                    name={employee.name}
                                    size="md"
                                />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                        {employee.name}
                                    </p>
                                    {employee.role && (
                                        <p className="text-xs text-slate-500">{employee.role}</p>
                                    )}
                                    {employee.employeeId && (
                                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                            ID {employee.employeeId}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {employee.phone && employee.phone !== "—" && (
                                <div className="visit-report-meta-list mt-4">
                                    <div className="visit-report-meta-row">
                                        <span className="visit-report-meta-row__label">Phone</span>
                                        <span className="visit-report-meta-row__value font-mono">
                                            {employee.phone}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="visit-report-section">
                        <div className="visit-report-section__head">
                            <span className="visit-report-section__number" aria-hidden="true">
                                <Leaf className="w-3.5 h-3.5" strokeWidth={2.5} />
                            </span>
                            <div className="visit-report-section__title-wrap">
                                <h2 className="visit-report-section__title">Report metadata</h2>
                            </div>
                        </div>
                        <div className="visit-report-section__body">
                            <dl className="visit-report-meta-list">
                                <div className="visit-report-meta-row">
                                    <dt className="visit-report-meta-row__label">Report ID</dt>
                                    <dd className="visit-report-meta-row__value font-mono">
                                        #{v?.id ?? id}
                                    </dd>
                                </div>
                                <div className="visit-report-meta-row">
                                    <dt className="visit-report-meta-row__label">Village</dt>
                                    <dd className="visit-report-meta-row__value">{farmer.village}</dd>
                                </div>
                                <div className="visit-report-meta-row">
                                    <dt className="visit-report-meta-row__label">Land area</dt>
                                    <dd className="visit-report-meta-row__value">{field.landArea}</dd>
                                </div>
                                <div className="visit-report-meta-row">
                                    <dt className="visit-report-meta-row__label">Attachments</dt>
                                    <dd className="visit-report-meta-row__value">
                                        {headerAttachmentCount ?? 0}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
}
