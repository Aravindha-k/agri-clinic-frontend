import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getFarmerDetail, getFarmerFields, getFarmerVisits } from "../api/farmer.api";
import {
    ArrowLeft, User, Phone, MapPin, Sprout, LandPlot, Leaf,
    Calendar, AlertCircle, RefreshCw, ChevronRight, Download,
    FileText, Droplets, Layers, ClipboardList, Hash,
    TrendingUp, CheckCircle2, Clock,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ─── helpers ─── */
const fmt = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const totalAcreage = (fields) =>
    fields.reduce((s, f) => s + parseFloat(f.land_size ?? f.field_size ?? 0), 0).toFixed(1);

/* ─── Status badge ─── */
const StatusBadge = ({ status }) => {
    const map = {
        completed: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
        pending: { cls: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
        verified: { cls: "bg-blue-50 text-blue-700 border-blue-200", icon: CheckCircle2 },
    };
    const { cls, icon: Icon } = map[(status || "").toLowerCase()] || { cls: "bg-gray-50 text-gray-500 border-gray-200", icon: Clock };
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full border ${cls} capitalize`}>
            <Icon className="w-3 h-3" />{status || "—"}
        </span>
    );
};

/* ─── Sub-components ─── */
const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="flex items-center gap-3 bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
            <div className="text-xl font-bold text-gray-900 leading-none">{value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
        </div>
    </div>
);

const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-400 font-medium">{label}</div>
            <div className="text-sm font-semibold text-gray-800 mt-0.5">{value || "—"}</div>
        </div>
    </div>
);

/* ════════════════════════════════════════
   PDF Generator  (jsPDF v4 + jspdf-autotable v5)
   autoTable() returns { finalY } — do NOT use doc.lastAutoTable
════════════════════════════════════════ */
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
    doc.text(`Phone: ${farmer.phone || "—"}   District: ${farmer.district_name || farmer.district || "—"}   Village: ${farmer.village_name || farmer.village || "—"}`, 20, 64);

    /* stats row */
    const stats = [
        ["Fields", fields.length],
        ["Visits", visits.length],
        ["Acreage", `${totalAcreage(fields)} ac`],
        ["Completed", visits.filter(v => v.status?.toLowerCase() === "completed").length],
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
            head: [["#", "Date", "Crop", "Status", "Village"]],
            body: visits.map((v, i) => [
                i + 1, fmt(v.visit_date || v.created_at),
                v.crop_name || v.crop || "—", v.status || "—", v.village_name || "—",
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

/* ════════════════════════════════════════
   Word Generator  (HTML → .doc blob — no docx package needed)
════════════════════════════════════════ */
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
           <tr style="background:#16a34a;color:white"><th>No.</th><th>Date</th><th>Crop</th><th>Status</th><th>Village</th></tr>
           ${visits.map((v, i) => `<tr${i % 2 === 1 ? ' style="background:#f0fdf4"' : ""}><td>${i + 1}</td><td>${fmt(v.visit_date || v.created_at)}</td><td>${esc(v.crop_name || v.crop)}</td><td>${esc(v.status)}</td><td>${esc(v.village_name)}</td></tr>`).join("")}
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
<p>Phone: <strong>${esc(farmer.phone)}</strong> &nbsp;|&nbsp; District: <strong>${esc(farmer.district_name || farmer.district)}</strong> &nbsp;|&nbsp; Village: <strong>${esc(farmer.village_name || farmer.village)}</strong></p>

<div class="stat-row">
  <div class="stat"><div class="stat-val">${fields.length}</div><div class="stat-lbl">Fields</div></div>
  <div class="stat"><div class="stat-val">${visits.length}</div><div class="stat-lbl">Visits</div></div>
  <div class="stat"><div class="stat-val">${totalAcreage(fields)}</div><div class="stat-lbl">Acres</div></div>
  <div class="stat"><div class="stat-val">${visits.filter(v => v.status?.toLowerCase() === "completed").length}</div><div class="stat-lbl">Completed</div></div>
</div>

<h2>Personal &amp; Farm Details</h2>
<table border="1">
<tr style="background:#16a34a;color:white"><th>Field</th><th>Value</th></tr>
${row("Full Name", farmer.name)}
${row("Phone", farmer.phone)}
${row("District", farmer.district_name || farmer.district)}
${row("Village", farmer.village_name || farmer.village)}
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

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
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
                setVisits(Array.isArray(d) ? d : Array.isArray(d?.results) ? d.results : Array.isArray(d?.data) ? d.data : []);
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

    /* ── Loading ── */
    if (loading) return (
        <div className="p-6 max-w-5xl mx-auto space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-9 bg-gray-200 rounded-xl w-36" />
                <div className="h-9 bg-gray-200 rounded-xl w-40" />
            </div>
            <div className="h-44 bg-gray-200 rounded-2xl" />
            <div className="flex gap-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-200 rounded-2xl flex-1" />)}</div>
            <div className="h-40 bg-gray-200 rounded-2xl" />
        </div>
    );

    if (error && !farmer) return (
        <div className="flex flex-col items-center justify-center py-32 px-6">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                <AlertCircle className="w-7 h-7 text-red-400" />
            </div>
            <p className="text-gray-700 font-semibold mb-4">{error}</p>
            <button onClick={fetchData}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition">
                <RefreshCw className="w-4 h-4" /> Retry
            </button>
        </div>
    );

    if (!farmer) return (
        <div className="flex flex-col items-center justify-center py-32 px-6">
            <p className="text-gray-500">No farmer found.</p>
            <button onClick={() => navigate("/farmers")} className="mt-4 text-sm text-emerald-600 hover:underline">← Back to Farmers</button>
        </div>
    );

    const completedVisits = visits.filter(v => v.status?.toLowerCase() === "completed").length;
    const pendingVisits = visits.filter(v => v.status?.toLowerCase() === "pending").length;
    const acreage = totalAcreage(fields);

    const TABS = [
        { id: "info", label: "Overview", icon: User },
        { id: "fields", label: `Fields (${fields.length})`, icon: LandPlot },
        { id: "visits", label: `Visit History (${visits.length})`, icon: ClipboardList },
    ];

    return (
        <div className="bg-gray-50 pb-10">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-5">

                {/* ── Top bar ── */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <button onClick={() => navigate("/farmers")}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium shadow-sm transition-all">
                        <ArrowLeft className="w-4 h-4" /> Back to Farmers
                    </button>

                    {/* Download dropdown */}
                    <div className="relative" ref={dlRef}>
                        <button
                            onClick={() => setDlOpen(o => !o)}
                            disabled={!!generating}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-60 select-none">
                            {generating
                                ? <RefreshCw className="w-4 h-4 animate-spin" />
                                : <Download className="w-4 h-4" />}
                            {generating ? `Generating ${generating.toUpperCase()}…` : "Download Report"}
                        </button>
                        {dlOpen && (
                            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                                <button onClick={handlePDF}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-4 h-4 text-red-600" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold">Download PDF</div>
                                        <div className="text-xs text-gray-400">High-quality report</div>
                                    </div>
                                </button>
                                <div className="h-px bg-gray-100 mx-3" />
                                <button onClick={handleWord}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold">Download Word</div>
                                        <div className="text-xs text-gray-400">.doc — opens in Word</div>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Hero banner ── */}
                <div className="relative rounded-2xl overflow-hidden shadow"
                    style={{ background: "linear-gradient(135deg,#052e16 0%,#14532d 50%,#166534 100%)" }}>
                    <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
                    <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
                    <div className="relative z-10 px-6 py-7 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                        {/* Avatar */}
                        <div className="w-18 h-18 min-w-[72px] min-h-[72px] w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-400 flex items-center justify-center shadow-lg">
                            <span className="text-3xl font-black text-white select-none">
                                {(farmer.name || "F")[0].toUpperCase()}
                            </span>
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h1 className="text-2xl font-black text-white tracking-tight leading-snug">{farmer.name || "—"}</h1>
                                {farmer.farmer_id && (
                                    <span className="px-2 py-0.5 bg-white/10 text-emerald-200 text-xs rounded-full border border-white/20 font-mono">
                                        #{farmer.farmer_id}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-emerald-100 mt-1">
                                <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />{farmer.phone || "—"}</span>
                                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />{farmer.district_name || farmer.district || "—"}</span>
                                <span className="flex items-center gap-1.5"><Sprout className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />{farmer.village_name || farmer.village || "—"}</span>
                                {farmer.created_at && (
                                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />Since {fmt(farmer.created_at)}</span>
                                )}
                            </div>
                        </div>
                        {/* Quick stats */}
                        <div className="flex gap-2 flex-shrink-0 flex-wrap sm:flex-nowrap">
                            {[["Fields", fields.length], ["Visits", visits.length], ["Acres", acreage]].map(([lbl, val]) => (
                                <div key={lbl} className="bg-white/10 rounded-xl px-4 py-3 text-center border border-white/10 min-w-[64px]">
                                    <div className="text-2xl font-black text-white leading-none">{val}</div>
                                    <div className="text-xs text-emerald-200 mt-1">{lbl}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Stat cards ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard icon={LandPlot} label="Total Fields" value={fields.length} color="bg-emerald-500" />
                    <StatCard icon={TrendingUp} label="Total Acreage" value={`${acreage} ac`} color="bg-teal-500" />
                    <StatCard icon={CheckCircle2} label="Completed Visits" value={completedVisits} color="bg-blue-500" />
                    <StatCard icon={Clock} label="Pending Visits" value={pendingVisits} color="bg-amber-500" />
                </div>

                {/* ── Tabs ── */}
                <div className="flex gap-1 bg-white border border-gray-100 p-1 rounded-xl shadow-sm w-fit">
                    {TABS.map((t) => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                                ${tab === t.id
                                    ? "bg-emerald-600 text-white shadow-sm"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
                            <t.icon className="w-4 h-4" />
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ══ Overview ══ */}
                {tab === "info" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Personal Details</h3>
                            <InfoRow icon={User} label="Full Name" value={farmer.name} />
                            <InfoRow icon={Phone} label="Phone Number" value={farmer.phone} />
                            <InfoRow icon={Hash} label="Farmer ID" value={farmer.farmer_id} />
                            <InfoRow icon={Calendar} label="Registered On" value={fmt(farmer.created_at)} />
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Location</h3>
                            <InfoRow icon={MapPin} label="District" value={farmer.district_name || farmer.district} />
                            <InfoRow icon={MapPin} label="Village" value={farmer.village_name || farmer.village} />
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Farm Details</h3>
                            <InfoRow icon={LandPlot} label="Total Land Area" value={farmer.total_land_area ? `${farmer.total_land_area} acres` : null} />
                            <InfoRow icon={Layers} label="Soil Type" value={farmer.soil_type} />
                            <InfoRow icon={Droplets} label="Irrigation Type" value={farmer.irrigation_type} />
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Visit Summary</h3>
                            <div className="space-y-2">
                                {[
                                    { label: "Total Visits", val: visits.length, cls: "bg-gray-50 text-gray-700" },
                                    { label: "Completed", val: completedVisits, cls: "bg-emerald-50 text-emerald-700" },
                                    { label: "Pending", val: pendingVisits, cls: "bg-amber-50 text-amber-700" },
                                ].map(({ label, val, cls }) => (
                                    <div key={label} className="flex items-center justify-between rounded-xl px-4 py-2.5 bg-gray-50">
                                        <span className="text-sm text-gray-600 font-medium">{label}</span>
                                        <span className={`px-3 py-1 rounded-lg text-sm font-bold ${cls}`}>{val}</span>
                                    </div>
                                ))}
                                {visits.length > 0 && (
                                    <p className="pt-2 text-xs text-gray-400 px-1">
                                        Last visit: <span className="font-semibold text-gray-600">{fmt(visits[0]?.visit_date || visits[0]?.created_at)}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ Fields ══ */}
                {tab === "fields" && (
                    fields.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center py-20">
                            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                                <LandPlot className="w-7 h-7 text-emerald-300" />
                            </div>
                            <p className="text-gray-600 font-semibold">No fields registered yet</p>
                            <p className="text-xs text-gray-400 mt-1">Fields added through visits will appear here</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {fields.map((f, i) => (
                                <div key={f.id || i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-emerald-100 transition-all">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                                                <LandPlot className="w-5 h-5 text-emerald-600" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 text-sm">{f.land_name || f.field_name || `Field ${i + 1}`}</div>
                                                {f.gps_location && (
                                                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />{f.gps_location}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="text-2xl font-black text-emerald-600">{f.land_size ?? f.field_size ?? "—"}</div>
                                            <div className="text-xs text-gray-400">acres</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-50">
                                        <div>
                                            <div className="text-xs text-gray-400 flex items-center gap-1 mb-1"><Layers className="w-3 h-3" />Soil Type</div>
                                            <div className="text-sm font-semibold text-gray-700">{f.soil_type || "—"}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-400 flex items-center gap-1 mb-1"><Droplets className="w-3 h-3" />Irrigation</div>
                                            <div className="text-sm font-semibold text-gray-700">{f.irrigation_type || "—"}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}

                {/* ══ Visit History ══ */}
                {tab === "visits" && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                            <ClipboardList className="w-4 h-4 text-emerald-600" />
                            <h3 className="text-sm font-bold text-gray-800">Visit History</h3>
                            <span className="ml-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-600 text-xs rounded-full font-bold">{visits.length}</span>
                        </div>
                        {visits.length === 0 ? (
                            <div className="flex flex-col items-center py-20">
                                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                                    <Leaf className="w-7 h-7 text-emerald-300" />
                                </div>
                                <p className="text-gray-600 font-semibold">No visits recorded yet</p>
                                <p className="text-xs text-gray-400 mt-1">Visits associated with this farmer will appear here</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {visits.map((v, i) => (
                                    <div key={v.id || i}
                                        onClick={() => v.id && navigate(`/visits/${v.id}`)}
                                        className={`px-6 py-4 flex items-start justify-between gap-4 transition-colors group ${v.id ? "cursor-pointer hover:bg-emerald-50/40" : ""}`}>
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                            {/* timeline dot */}
                                            <div className="flex flex-col items-center flex-shrink-0 pt-1">
                                                <div className={`w-3 h-3 rounded-full border-2 ${v.status?.toLowerCase() === "completed" ? "bg-emerald-500 border-emerald-600"
                                                        : v.status?.toLowerCase() === "pending" ? "bg-amber-400 border-amber-500"
                                                            : "bg-gray-300 border-gray-400"}`} />
                                                {i < visits.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1 min-h-[28px]" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <span className="text-sm font-bold text-gray-900">{fmt(v.visit_date || v.created_at)}</span>
                                                    <StatusBadge status={v.status} />
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 mt-1">
                                                    {(v.crop_name || v.crop) && <span className="flex items-center gap-1"><Leaf className="w-3 h-3 text-emerald-400" />{v.crop_name || v.crop}</span>}
                                                    {v.village_name && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-400" />{v.village_name}</span>}
                                                    {v.employee_name && <span className="flex items-center gap-1"><User className="w-3 h-3 text-gray-400" />{v.employee_name}</span>}
                                                </div>
                                                {v.notes && <p className="mt-1.5 text-xs text-gray-400 italic line-clamp-2">{v.notes}</p>}
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors flex-shrink-0 mt-1" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
