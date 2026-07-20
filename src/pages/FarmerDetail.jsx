import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getFarmerDetail, getFarmerFields, getFarmerVisits, uploadFarmerPhoto } from "../api/farmer.api";
import ProfilePhotoUpload from "../components/ui/ProfilePhotoUpload";
import {
    ArrowLeft, User, Phone, MapPin, Sprout, LandPlot, Leaf,
    Calendar, RefreshCw, ChevronRight, Download,
    FileText, Droplets, Layers, ClipboardList, Hash, Edit2,
    TrendingUp, StickyNote, ImageIcon,
} from "lucide-react";
import { visitWhenLabel, visitHasGps, visitEmployeeLabel } from "../utils/visitFarmer";
import RouteFallback from "../components/RouteFallback";

const FarmerVisitTrendChart = lazy(() => import("../components/farmers/FarmerVisitTrendChart"));
import { resolveVisitCropDisplay, resolveVisitFieldNotes } from "../utils/visitDisplay";
import {
    resolveVillageLabel,
    resolveDistrictLabel,
} from "../utils/displayValue";
import { GpsIndicator, EmptyState } from "../components/ui/command";
import ErrorRetry from "../components/ui/ErrorRetry";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* --- helpers --- */
const fmt = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const totalAcreage = (fields) =>
    fields.reduce((s, f) => s + parseFloat(f.land_size ?? f.field_size ?? 0), 0).toFixed(1);

/* --- Sub-components (presentational) --- */
const KPI_ICONS = {
    emerald: "bg-emerald-500",
    teal: "bg-teal-500",
    blue: "bg-blue-500",
    cyan: "bg-cyan-600",
};

const StatCard = ({ icon: Icon, label, value, color = "emerald" }) => (
    <div className="farmer-detail-kpi">
        <div className={`farmer-detail-kpi__icon ${KPI_ICONS[color] || KPI_ICONS.emerald}`}>
            <Icon className="w-4 h-4" strokeWidth={2.25} />
        </div>
        <div className="min-w-0">
            <div className="farmer-detail-kpi__value">{value}</div>
            <div className="farmer-detail-kpi__label">{label}</div>
        </div>
    </div>
);

const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="farmer-detail-info-row">
        <div className="farmer-detail-info-row__icon">
            <Icon className="w-4 h-4" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
            <div className="farmer-detail-info-row__label">{label}</div>
            <div className="farmer-detail-info-row__value">{value || "—"}</div>
        </div>
    </div>
);

function FarmerDetailSkeleton() {
    return (
        <div className="farmer-detail space-y-5">
            <div className="flex justify-between gap-3">
                <div className="skeleton h-10 w-36 rounded-xl" />
                <div className="flex gap-2">
                    <div className="skeleton h-10 w-20 rounded-xl" />
                    <div className="skeleton h-10 w-36 rounded-xl" />
                </div>
            </div>
            <div className="farmer-detail-skeleton-hero">
                <div className="flex gap-5 items-center">
                    <div className="skeleton w-24 h-24 rounded-2xl flex-shrink-0" />
                    <div className="flex-1 space-y-3">
                        <div className="skeleton h-7 w-48 rounded-lg" />
                        <div className="skeleton h-4 w-64 max-w-full rounded" />
                        <div className="skeleton h-4 w-56 max-w-full rounded" />
                    </div>
                </div>
            </div>
            <div className="farmer-detail-kpi-grid">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton h-20 rounded-2xl" />
                ))}
            </div>
            <div className="skeleton h-12 w-full sm:w-96 rounded-xl" />
            <div className="farmer-detail-grid">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton h-56 rounded-2xl" />
                ))}
            </div>
        </div>
    );
}

/* ----------------------------------------
   PDF Generator  (jsPDF v4 + jspdf-autotable v5)
   autoTable() returns { finalY } — do NOT use doc.lastAutoTable
---------------------------------------- */
function generatePDF(farmer, fields, visits) {
    const doc = new jsPDF();
    const GREEN = [22, 163, 74];
    const LG = [240, 253, 244];
    const name = farmer.name || "—";

    /* header banner */
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(17).setFont("helvetica", "bold");
    doc.text("Farmer Profile Report", 14, 13);
    doc.setFontSize(9).setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 14, 21);
    doc.text("AgriAdmin Enterprise", 196, 21, { align: "right" });

    /* name block */
    doc.setFillColor(...LG);
    doc.roundedRect(14, 36, 182, 34, 4, 4, "F");
    doc.setTextColor(22, 101, 52);
    doc.setFontSize(18).setFont("helvetica", "bold");
    doc.text(name, 20, 52);
    doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(75, 85, 99);
    doc.text(`Phone: ${farmer.phone || "—"}   District: ${farmer.district_name || resolveDistrictLabel(farmer.district)}   Village: ${farmer.village_name || resolveVillageLabel(farmer.village)}`, 20, 64);

    /* stats row */
    const stats = [
        ["Fields", fields.length],
        ["Visits", visits.length],
        ["Acreage", `${totalAcreage(fields)} ac`],
        ["With GPS", visits.filter(visitHasGps).length],
    ];
    stats.forEach(([lbl, val], i) => {
        const x = 14 + i * 46;
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, 76, 42, 22, 3, 3, "F");
        doc.setTextColor(...GREEN).setFontSize(13).setFont("helvetica", "bold");
        doc.text(String(val), x + 21, 87, { align: "center" });
        doc.setFontSize(7).setFont("helvetica", "normal").setTextColor(107, 114, 128);
        doc.text(lbl, x + 21, 94, { align: "center" });
    });

    /* personal details table */
    doc.setFontSize(11).setFont("helvetica", "bold").setTextColor(17, 24, 39);
    doc.text("Personal & Farm Details", 14, 108);
    let r1 = autoTable(doc, {
        startY: 112,
        head: [["Field", "Value"]],
        body: [
            ["Full Name", farmer.name || "—"],
            ["Phone", farmer.phone || "—"],
            ["District", farmer.district_name || farmer.district || "—"],
            ["Village", farmer.village_name || farmer.village || "—"],
            ["Total Land Area", farmer.total_land_area ? `${farmer.total_land_area} acres` : "—"],
            ["Soil Type", farmer.soil_type || "—"],
            ["Irrigation", farmer.irrigation_type || "—"],
            ["Registered On", fmt(farmer.created_at)],
        ],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: GREEN, textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: LG },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
        margin: { left: 14, right: 14 },
    });
    let lastY = r1.finalY;

    /* fields table */
    if (fields.length > 0) {
        lastY += 10;
        doc.setFontSize(11).setFont("helvetica", "bold").setTextColor(17, 24, 39);
        doc.text(`Farm Fields (${fields.length})`, 14, lastY);
        let r2 = autoTable(doc, {
            startY: lastY + 4,
            head: [["#", "Field Name", "Size (ac)", "Soil Type", "Irrigation"]],
            body: fields.map((f, i) => [
                i + 1, f.land_name || f.field_name || `Field ${i + 1}`,
                f.land_size ?? f.field_size ?? "—", f.soil_type || "—", f.irrigation_type || "—",
            ]),
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: GREEN, textColor: 255, fontStyle: "bold" },
            alternateRowStyles: { fillColor: LG },
            margin: { left: 14, right: 14 },
        });
        lastY = r2.finalY;
    }

    /* visits table */
    if (visits.length > 0) {
        lastY += 10;
        doc.setFontSize(11).setFont("helvetica", "bold").setTextColor(17, 24, 39);
        doc.text(`Visit History (${visits.length})`, 14, lastY);
        autoTable(doc, {
            startY: lastY + 4,
            head: [["#", "Date & time", "Crop", "Employee", "Village"]],
            body: visits.map((v, i) => [
                i + 1,
                visitWhenLabel(v) !== "—" ? visitWhenLabel(v) : fmt(v.visit_date || v.created_at),
                v.crop_name || resolveVisitCropDisplay(v),
                visitEmployeeLabel(v),
                v.village_name || resolveVillageLabel(v?.village),
            ]),
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: GREEN, textColor: 255, fontStyle: "bold" },
            alternateRowStyles: { fillColor: LG },
            margin: { left: 14, right: 14 },
        });
    }

    /* page numbers */
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setFontSize(8).setTextColor(156, 163, 175);
        doc.text(`Page ${i} of ${total}`, 105, 290, { align: "center" });
    }

    doc.save(`Farmer_${name.replace(/\s+/g, "_")}_Profile.pdf`);
}

/* ----------------------------------------
   Word Generator  (HTML ? .doc blob — no docx package needed)
---------------------------------------- */
function generateWord(farmer, fields, visits) {
    const esc = (s) => String(s ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const row = (...cells) => `<tr>${cells.map((c, i) => `<td style="${i === 0 ? "font-weight:bold;background:#f0fdf4;" : ""}">${esc(c)}</td>`).join("")}</tr>`;

    const fieldsHtml = fields.length === 0
        ? `<p style="color:#6b7280">No fields registered.</p>`
        : `<h2 style="color:#166534;border-bottom:2px solid #16a34a;padding-bottom:4px">Farm Fields (${fields.length})</h2>
           <table border="1" style="border-collapse:collapse;width:100%;font-size:13px">
           <tr style="background:#16a34a;color:white"><th>No.</th><th>Field Name</th><th>Size (acres)</th><th>Soil Type</th><th>Irrigation</th></tr>
           ${fields.map((f, i) => `<tr${i % 2 === 1 ? ' style="background:#f0fdf4"' : ""}><td>${i + 1}</td><td>${esc(f.land_name || f.field_name || `Field ${i + 1}`)}</td><td>${esc(f.land_size ?? f.field_size)}</td><td>${esc(f.soil_type)}</td><td>${esc(f.irrigation_type)}</td></tr>`).join("")}
           </table>`;

    const visitsHtml = visits.length === 0
        ? `<p style="color:#6b7280">No visits recorded.</p>`
        : `<h2 style="color:#166534;border-bottom:2px solid #16a34a;padding-bottom:4px">Visit History (${visits.length})</h2>
           <table border="1" style="border-collapse:collapse;width:100%;font-size:13px">
           <tr style="background:#16a34a;color:white"><th>No.</th><th>Date & time</th><th>Crop</th><th>Employee</th><th>Village</th></tr>
           ${visits.map((v, i) => `<tr${i % 2 === 1 ? ' style="background:#f0fdf4"' : ""}><td>${i + 1}</td><td>${esc(visitWhenLabel(v) !== "—" ? visitWhenLabel(v) : fmt(v.visit_date || v.created_at))}</td><td>${esc(resolveVisitCropDisplay(v))}</td><td>${esc(visitEmployeeLabel(v))}</td><td>${esc(v.village_name || resolveVillageLabel(v?.village))}</td></tr>`).join("")}
           </table>`;

    const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Farmer Profile</title>
<style>
  body{font-family:Arial,sans-serif;margin:40px;color:#111827}
  h1{color:#16a34a;margin-bottom:4px}
  h2{color:#166534;border-bottom:2px solid #16a34a;padding-bottom:4px;margin-top:24px}
  table{border-collapse:collapse;width:100%;margin-bottom:16px;font-size:13px}
  th{background:#16a34a;color:white;padding:8px 12px;text-align:left;font-weight:bold}
  td{border:1px solid #d1fae5;padding:7px 12px}
  .meta{color:#6b7280;font-size:12px;margin-bottom:20px}
  .stat-row{display:flex;gap:32px;margin:12px 0 20px}
  .stat{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 20px;text-align:center}
  .stat-val{font-size:22px;font-weight:700;color:#16a34a}
  .stat-lbl{font-size:11px;color:#6b7280}
</style>
</head>
<body>
<h1>Farmer Profile Report</h1>
<p class="meta">Generated: ${new Date().toLocaleDateString("en-IN")} &nbsp;|&nbsp; AgriAdmin Enterprise</p>

<h2>${esc(farmer.name)}</h2>
<p>Phone: <strong>${esc(farmer.phone)}</strong> &nbsp;|&nbsp; District: <strong>${esc(farmer.district_name || resolveDistrictLabel(farmer.district))}</strong> &nbsp;|&nbsp; Village: <strong>${esc(farmer.village_name || resolveVillageLabel(farmer.village))}</strong></p>

<div class="stat-row">
  <div class="stat"><div class="stat-val">${fields.length}</div><div class="stat-lbl">Fields</div></div>
  <div class="stat"><div class="stat-val">${visits.length}</div><div class="stat-lbl">Visits</div></div>
  <div class="stat"><div class="stat-val">${totalAcreage(fields)}</div><div class="stat-lbl">Acres</div></div>
  <div class="stat"><div class="stat-val">${visits.filter(visitHasGps).length}</div><div class="stat-lbl">With GPS</div></div>
</div>

<h2>Personal &amp; Farm Details</h2>
<table border="1">
<tr style="background:#16a34a;color:white"><th>Field</th><th>Value</th></tr>
${row("Full Name", farmer.name)}
${row("Phone", farmer.phone)}
${row("District", farmer.district_name || farmer.district)}
${row("Village", farmer.village_name || resolveVillageLabel(farmer.village))}
${row("Total Land Area", farmer.total_land_area ? farmer.total_land_area + " acres" : null)}
${row("Soil Type", farmer.soil_type)}
${row("Irrigation Type", farmer.irrigation_type)}
${row("Registered On", fmt(farmer.created_at))}
</table>

${fieldsHtml}
${visitsHtml}
</body></html>`;

    const blob = new Blob(["\ufeff", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Farmer_${(farmer.name || "Report").replace(/\s+/g, "_")}_Profile.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/* ----------------------------------------
   MAIN COMPONENT
---------------------------------------- */
export default function FarmerDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [farmer, setFarmer] = useState(null);
    const [fields, setFields] = useState([]);
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tab, setTab] = useState("info");
    const [dlOpen, setDlOpen] = useState(false);
    const [generating, setGenerating] = useState(null);
    const dlRef = useRef();

    const fetchData = async () => {
        if (!id) return;
        setLoading(true); setError(null);
        try {
            const [farmerRes, fieldsRes, visitsRes] = await Promise.allSettled([
                getFarmerDetail(id),
                getFarmerFields(id),
                getFarmerVisits(id),
            ]);
            if (farmerRes.status === "fulfilled") {
                const d = farmerRes.value;
                setFarmer(d?.data ?? d ?? null);
            } else {
                setError("Failed to load farmer details");
            }
            if (fieldsRes.status === "fulfilled") {
                const d = fieldsRes.value;
                setFields(Array.isArray(d) ? d : Array.isArray(d?.results) ? d.results : Array.isArray(d?.data) ? d.data : []);
            }
            if (visitsRes.status === "fulfilled") {
                const d = visitsRes.value;
                const list = Array.isArray(d)
                    ? d
                    : Array.isArray(d?.results)
                        ? d.results
                        : Array.isArray(d?.data?.results)
                            ? d.data.results
                            : Array.isArray(d?.data)
                                ? d.data
                                : [];
                setVisits(list);
            }
        } catch {
            setError("Failed to load farmer data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [id]);

    useEffect(() => {
        if (!dlOpen) return;
        const h = (e) => { if (dlRef.current && !dlRef.current.contains(e.target)) setDlOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, [dlOpen]);

    const handlePDF = () => {
        setGenerating("pdf"); setDlOpen(false);
        try { generatePDF(farmer, fields, visits); }
        catch (e) { console.error("PDF error", e); }
        finally { setGenerating(null); }
    };

    const handleWord = () => {
        setGenerating("word"); setDlOpen(false);
        try { generateWord(farmer, fields, visits); }
        catch (e) { console.error("Word error", e); }
        finally { setGenerating(null); }
    };

    if (loading) {
        return <FarmerDetailSkeleton />;
    }

    if (error && !farmer) {
        return (
            <div className="farmer-detail">
                <ErrorRetry message={error} onRetry={fetchData} />
            </div>
        );
    }

    if (!farmer) {
        return (
            <div className="farmer-detail">
                <EmptyState
                    icon={User}
                    title="Farmer not found"
                    subtitle="This farmer record may have been removed or the link is invalid."
                    action={
                        <button type="button" onClick={() => navigate("/farmers")} className="btn btn-secondary btn-md">
                            <ArrowLeft className="w-4 h-4" /> Back to Farmers
                        </button>
                    }
                    className="py-20"
                />
            </div>
        );
    }

    const gpsVisits = visits.filter(visitHasGps).length;
    const acreage = totalAcreage(fields);
    const lastVisitLabel =
        visits.length > 0
            ? visitWhenLabel(visits[0]) !== "\u2014"
                ? visitWhenLabel(visits[0])
                : fmt(visits[0]?.visit_date || visits[0]?.created_at)
            : "\u2014";

    const lastFieldNotes = (() => {
        for (const v of visits) {
            const text = resolveVisitFieldNotes(v);
            if (text && text !== "Not added by employee") return text;
        }
        return null;
    })();

    const assignedEmployee =
        visits.length > 0 ? visitEmployeeLabel(visits[0]) : farmer.assigned_employee_name || "\u2014";

    const visitTrendData = (() => {
        const byMonth = {};
        visits.forEach((v) => {
            const raw = v.visit_date || v.created_at;
            if (!raw) return;
            const d = new Date(raw);
            const key = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
            byMonth[key] = (byMonth[key] || 0) + 1;
        });
        return Object.entries(byMonth)
            .slice(-6)
            .map(([label, count]) => ({ label, count }));
    })();

    const TABS = [
        { id: "info", label: "Overview", icon: User },
        { id: "fields", label: `Fields (${fields.length})`, icon: LandPlot },
        { id: "visits", label: `Visit History (${visits.length})`, icon: ClipboardList },
    ];

    return (
        <div className="farmer-detail space-y-5">
            <div className="farmer-detail-toolbar">
                <button type="button" onClick={() => navigate("/farmers")} className="farmer-detail-back">
                    <ArrowLeft className="w-4 h-4" /> Back to Farmers
                </button>

                <div className="farmer-detail-actions">
                    <button type="button" onClick={() => navigate(`/farmers/${id}/edit`)} className="btn btn-secondary btn-md">
                        <Edit2 className="w-4 h-4" /> Edit
                    </button>
                    <div className="farmer-detail-download" ref={dlRef}>
                        <button
                            type="button"
                            onClick={() => setDlOpen((o) => !o)}
                            disabled={!!generating}
                            className="btn btn-primary btn-md disabled:opacity-60"
                        >
                            {generating ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            {generating ? `Generating ${generating.toUpperCase()}…` : "Download Report"}
                        </button>
                        {dlOpen && (
                            <div className="farmer-detail-download__menu enterprise-dropdown">
                                <button type="button" onClick={handlePDF} className="farmer-detail-download__item farmer-detail-download__item--pdf">
                                    <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-4 h-4 text-red-600" />
                                    </div>
                                    <div>
                                        <div className="font-semibold">Download PDF</div>
                                        <div className="text-xs text-slate-400">High-quality report</div>
                                    </div>
                                </button>
                                <div className="h-px bg-slate-100 mx-3" />
                                <button type="button" onClick={handleWord} className="farmer-detail-download__item farmer-detail-download__item--word">
                                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <div className="font-semibold">Download Word</div>
                                        <div className="text-xs text-slate-400">.doc — opens in Word</div>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="farmer-detail-hero">
                <div className="farmer-detail-hero__glow -top-10 -right-10 w-44 h-44" aria-hidden="true" />
                <div className="farmer-detail-hero__glow -bottom-8 -left-8 w-32 h-32" aria-hidden="true" />
                <div className="farmer-detail-hero__inner">
                    <div className="farmer-detail-hero__photo">
                        <ProfilePhotoUpload
                            entity={farmer}
                            displayName={farmer.name || "Farmer"}
                            size="xl"
                            variant="teal"
                            onUpload={(file) => uploadFarmerPhoto(farmer.id, file)}
                            onPhotoUpdated={(url, data) =>
                                setFarmer((f) => ({ ...f, profile_photo_url: url, ...data }))
                            }
                        />
                    </div>
                    <div className="farmer-detail-hero__content">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="farmer-detail-hero__name">{farmer.name || "—"}</h1>
                            {farmer.farmer_id && (
                                <span className="farmer-detail-hero__id">#{farmer.farmer_id}</span>
                            )}
                        </div>
                        <div className="farmer-detail-hero__meta">
                            <span className="farmer-detail-hero__meta-item">
                                <Phone className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
                                {farmer.phone || "—"}
                            </span>
                            <span className="farmer-detail-hero__meta-item">
                                <MapPin className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
                                {farmer.district_name || farmer.district || "—"}
                            </span>
                            <span className="farmer-detail-hero__meta-item">
                                <Sprout className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
                                {farmer.village_name || resolveVillageLabel(farmer.village)}
                            </span>
                            {farmer.created_at && (
                                <span className="farmer-detail-hero__meta-item">
                                    <Calendar className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
                                    Since {fmt(farmer.created_at)}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="farmer-detail-hero__stats">
                        {[["Fields", fields.length], ["Visits", visits.length], ["Acres", acreage]].map(([lbl, val]) => (
                            <div key={lbl} className="farmer-detail-hero__stat">
                                <div className="farmer-detail-hero__stat-value">{val}</div>
                                <div className="farmer-detail-hero__stat-label">{lbl}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="farmer-detail-kpi-grid">
                <StatCard icon={LandPlot} label="Total Fields" value={fields.length} color="emerald" />
                <StatCard icon={TrendingUp} label="Total Acreage" value={`${acreage} ac`} color="teal" />
                <StatCard icon={ClipboardList} label="Submitted Visits" value={visits.length} color="blue" />
                <StatCard icon={MapPin} label="With GPS" value={gpsVisits} color="cyan" />
            </div>

            <div className="farmer-detail-tabs" role="tablist" aria-label="Farmer profile sections">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.id}
                        onClick={() => setTab(t.id)}
                        className={`farmer-detail-tab ${tab === t.id ? "farmer-detail-tab--active" : ""}`}
                    >
                        <t.icon className="w-4 h-4" aria-hidden="true" />
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === "info" && (
                <div className="farmer-detail-grid">
                    <div className="farmer-detail-photo-card">
                        <h3 className="farmer-detail-card__title w-full text-left flex items-center gap-2">
                            <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
                            Profile Photo
                        </h3>
                        <ProfilePhotoUpload
                            entity={farmer}
                            displayName={farmer.name || "Farmer"}
                            size="2xl"
                            variant="teal"
                            onUpload={(file) => uploadFarmerPhoto(farmer.id, file)}
                            onPhotoUpdated={(url, data) =>
                                setFarmer((f) => ({ ...f, profile_photo_url: url, ...data }))
                            }
                        />
                        <p className="farmer-detail-photo-card__hint">
                            Tap the photo to update the farmer profile image. Used across visits and reports.
                        </p>
                    </div>

                    <div className="farmer-detail-card">
                        <h3 className="farmer-detail-card__title">Personal Details</h3>
                        <InfoRow icon={User} label="Full Name" value={farmer.name} />
                        <InfoRow icon={Phone} label="Phone Number" value={farmer.phone} />
                        <InfoRow icon={Hash} label="Farmer ID" value={farmer.farmer_id} />
                        <InfoRow icon={Calendar} label="Registered On" value={fmt(farmer.created_at)} />
                    </div>

                    <div className="farmer-detail-card">
                        <h3 className="farmer-detail-card__title">Location</h3>
                        <InfoRow icon={MapPin} label="District" value={farmer.district_name || farmer.district} />
                        <InfoRow icon={MapPin} label="Village" value={farmer.village_name || resolveVillageLabel(farmer.village)} />
                    </div>

                    <div className="farmer-detail-card">
                        <h3 className="farmer-detail-card__title">Farm & Land Details</h3>
                        <InfoRow icon={LandPlot} label="Total Land Area" value={farmer.total_land_area ? `${farmer.total_land_area} acres` : null} />
                        <InfoRow icon={Layers} label="Soil Type" value={farmer.soil_type} />
                        <InfoRow icon={Droplets} label="Irrigation Type" value={farmer.irrigation_type} />
                    </div>

                    <div className="farmer-detail-card">
                        <h3 className="farmer-detail-card__title">Field Intelligence</h3>
                        <InfoRow icon={ClipboardList} label="Visit count" value={String(visits.length)} />
                        <InfoRow icon={Calendar} label="Last visit date" value={lastVisitLabel} />
                        <InfoRow icon={User} label="Last assigned employee" value={assignedEmployee} />
                        {lastFieldNotes ? (
                            <div className="farmer-detail-notes">
                                <p className="farmer-detail-notes__label">
                                    <StickyNote className="w-3.5 h-3.5" aria-hidden="true" />
                                    Latest field notes
                                </p>
                                <p className="farmer-detail-notes__body">{lastFieldNotes}</p>
                            </div>
                        ) : (
                            <InfoRow icon={Leaf} label="Last observation" value={null} />
                        )}
                        <div className="farmer-detail-chart-wrap">
                            <p className="farmer-detail-chart-wrap__label">Visit trend (last 6 periods)</p>
                            <Suspense fallback={<RouteFallback label="Loading chart…" />}>
                                <FarmerVisitTrendChart data={visitTrendData} />
                            </Suspense>
                        </div>
                    </div>

                    <div className="farmer-detail-card">
                        <h3 className="farmer-detail-card__title">Visit Summary</h3>
                        <div className="space-y-2">
                            {[
                                { label: "Submitted visits", val: visits.length, cls: "bg-slate-100 text-slate-700" },
                                { label: "With GPS", val: gpsVisits, cls: "bg-emerald-50 text-emerald-700" },
                            ].map(({ label, val, cls }) => (
                                <div key={label} className="farmer-detail-summary-row">
                                    <span className="text-sm text-slate-600 font-medium">{label}</span>
                                    <span className={`farmer-detail-summary-row__badge ${cls}`}>{val}</span>
                                </div>
                            ))}
                            {visits.length > 0 && (
                                <p className="pt-2 text-xs text-slate-400">
                                    Last visit: <span className="font-semibold text-slate-600">{lastVisitLabel}</span>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {tab === "fields" && (
                fields.length === 0 ? (
                    <EmptyState
                        icon={LandPlot}
                        title="No fields registered yet"
                        subtitle="Fields added through visits will appear here with land size, soil, and irrigation details."
                        className="py-20 dashboard-section-card"
                    />
                ) : (
                    <div className="farmer-detail-grid">
                        {fields.map((f, i) => (
                            <div key={f.id || i} className="farmer-detail-field-card">
                                <div className="farmer-detail-field-card__head">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="farmer-detail-field-card__icon">
                                            <LandPlot className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="farmer-detail-field-card__name">
                                                {f.land_name || f.field_name || `Field ${i + 1}`}
                                            </div>
                                            {f.gps_location && (
                                                <div className="farmer-detail-field-card__gps">
                                                    <MapPin className="w-3 h-3" />
                                                    {f.gps_location}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="farmer-detail-field-card__acreage">
                                        <div className="farmer-detail-field-card__acreage-value">
                                            {f.land_size ?? f.field_size ?? "—"}
                                        </div>
                                        <div className="text-xs text-slate-400">acres</div>
                                    </div>
                                </div>
                                <div className="farmer-detail-field-card__meta-grid">
                                    <div>
                                        <div className="farmer-detail-field-card__meta-label">
                                            <Layers className="w-3 h-3" /> Soil Type
                                        </div>
                                        <div className="farmer-detail-field-card__meta-value">{f.soil_type || "—"}</div>
                                    </div>
                                    <div>
                                        <div className="farmer-detail-field-card__meta-label">
                                            <Droplets className="w-3 h-3" /> Irrigation
                                        </div>
                                        <div className="farmer-detail-field-card__meta-value">{f.irrigation_type || "—"}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {tab === "visits" && (
                <div className="farmer-detail-visits-card">
                    <div className="farmer-detail-visits-card__header">
                        <div className="flex items-center gap-2.5">
                            <div className="icon-box">
                                <ClipboardList className="w-3.5 h-3.5" />
                            </div>
                            <div>
                                <h3 className="section-title">Visit History</h3>
                                <p className="section-subtitle">{visits.length} recorded visit{visits.length !== 1 ? "s" : ""}</p>
                            </div>
                        </div>
                        <span className="command-hero-badge">{visits.length} total</span>
                    </div>
                    {visits.length === 0 ? (
                        <EmptyState
                            icon={Leaf}
                            title="No visits recorded yet"
                            subtitle="Visits associated with this farmer will appear here as a timeline."
                            className="py-16"
                        />
                    ) : (
                        <div className="farmer-detail-visit-timeline">
                            {visits.map((v, i) => {
                                const notes = resolveVisitFieldNotes(v);
                                const clickable = Boolean(v.id);
                                return (
                                    <div
                                        key={v.id || i}
                                        onClick={() => v.id && navigate(`/visits/${v.id}`)}
                                        className={`farmer-detail-visit-item group ${clickable ? "farmer-detail-visit-item--clickable" : ""}`}
                                    >
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                            <div className="farmer-detail-visit-item__rail">
                                                <div
                                                    className={`farmer-detail-visit-item__dot ${
                                                        visitHasGps(v)
                                                            ? "farmer-detail-visit-item__dot--gps"
                                                            : "farmer-detail-visit-item__dot--nogps"
                                                    }`}
                                                />
                                                {i < visits.length - 1 && (
                                                    <div className="farmer-detail-visit-item__line" aria-hidden="true" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="farmer-detail-visit-item__date">
                                                    {visitWhenLabel(v) !== "—"
                                                        ? visitWhenLabel(v)
                                                        : fmt(v.visit_date || v.created_at)}
                                                </p>
                                                <div className="farmer-detail-visit-item__meta">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Leaf className="w-3 h-3 text-emerald-500" />
                                                        {resolveVisitCropDisplay(v)}
                                                    </span>
                                                    {(v.village_name || resolveVillageLabel(v?.village, "")) && (
                                                        <span className="inline-flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" />
                                                            {v.village_name || resolveVillageLabel(v?.village)}
                                                        </span>
                                                    )}
                                                    {visitEmployeeLabel(v) !== "—" && (
                                                        <span className="inline-flex items-center gap-1">
                                                            <User className="w-3 h-3" />
                                                            {visitEmployeeLabel(v)}
                                                        </span>
                                                    )}
                                                    <GpsIndicator latitude={v.latitude} longitude={v.longitude} compact />
                                                </div>
                                                {notes && notes !== "Not added by employee" && (
                                                    <p className="farmer-detail-visit-item__notes">{notes}</p>
                                                )}
                                            </div>
                                        </div>
                                        {clickable && (
                                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors flex-shrink-0 mt-1" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
