import { PageLoader } from "../components/ui/command";
import { useEffect, useState, useCallback, useRef, memo } from "react";
import { getCrops } from "../api/master.api";
import { unwrapResponse } from "../api/axios";
import {
    Wheat, Search, X, RefreshCw, ChevronLeft, ChevronRight, AlertCircle,
    TrendingUp, Leaf,
} from "lucide-react";

const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

const resolveList = (d) => {
    if (Array.isArray(d)) return d;
    if (d?.results) return d.results;
    if (d?.data) return d.data;
    return [];
};

const Bone = ({ className = "" }) => <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
const TableSkeleton = () => (
    <div className="section-card overflow-hidden" style={{ boxShadow: SHADOW }}>
        <div className="px-3 py-2 border-b border-gray-100"><Bone className="w-40 h-5" /></div>
        {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-2.5 border-b border-gray-50">
                <Bone className="w-8 h-8 !rounded-full" /><Bone className="w-28 h-4" /><Bone className="w-20 h-4" /><Bone className="w-16 h-4" />
            </div>
        ))}
    </div>
);

const useCountUp = (target, dur = 900) => {
    const [val, setVal] = useState(0);
    const prev = useRef(0);
    useEffect(() => {
        const s = prev.current, e = Number(target) || 0;
        if (s === e) { setVal(e); return; }
        const t0 = performance.now();
        let raf;
        const step = (now) => {
            const p = Math.min((now - t0) / dur, 1);
            setVal(Math.round(s + (e - s) * (1 - Math.pow(1 - p, 3))));
            if (p < 1) raf = requestAnimationFrame(step); else prev.current = e;
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [target, dur]);
    return val;
};

const KpiCard = memo(({ icon: Icon, label, value, accent, gradient, iconBg }) => {
    const animVal = useCountUp(value);
    return (
        <div className="mini-kpi-card group cursor-default" style={{ background: gradient, boxShadow: SHADOW }}>
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ background: accent }} />
            <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-[0.06]" style={{ background: accent }} />
            <div className="mini-kpi-icon" style={{ background: iconBg, color: accent }}>
                <Icon className="w-4 h-4" />
            </div>
            <p className="mini-kpi-value">{animVal}</p>
            <div className="flex items-center justify-between mt-1">
                <p className="mini-kpi-label">{label}</p>
                <TrendingUp className="w-3 h-3 text-gray-300" />
            </div>
        </div>
    );
});
KpiCard.displayName = "KpiCard";

/* ================================================================
   CROPS PAGE
   ================================================================ */
export default function Crops() {
    const [crops, setCrops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");

    const fetchCrops = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const raw = await getCrops();
            const list = resolveList(raw?.data ?? raw);
            setCrops(list);
        } catch {
            setError("Failed to load crops.");
            setCrops([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCrops(); }, [fetchCrops]);

    const filtered = crops.filter((c) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (c.name || "").toLowerCase().includes(q) || (c.variety || "").toLowerCase().includes(q);
    });

    return (
        <div className="page-container">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-lime-100 flex items-center justify-center text-lime-600">
                            <Wheat className="w-5 h-5" />
                        </div>
                        Crops
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">Manage crop database</p>
                </div>
                <button onClick={fetchCrops} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <KpiCard icon={Wheat} label="Total Crops" value={crops.length} accent="#65a30d" gradient="linear-gradient(135deg,#fff 0%,#f7fee7 100%)" iconBg="#ecfccb" />
                <KpiCard icon={Leaf} label="Shown" value={filtered.length} accent="#166534" gradient="linear-gradient(135deg,#fff 0%,#f0fdf4 100%)" iconBg="#dcfce7" />
            </div>

            {/* Search */}
            <div className="filters-bar" style={{ boxShadow: SHADOW, border: "1px solid rgba(0,0,0,0.04)" }}>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input type="text" placeholder="Search crop name…" value={search} onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all" />
                    </div>
                    {search && (
                        <button onClick={() => setSearch("")} className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-gray-500 hover:text-red-600 bg-gray-100 hover:bg-red-50 rounded-xl transition-all">
                            <X className="w-3.5 h-3.5" /> Clear
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
                    <button onClick={fetchCrops} className="ml-auto font-semibold hover:underline">Retry</button>
                </div>
            )}

            {/* Grid */}
            {loading ? <PageLoader label="Loading crops…" /> : filtered.length === 0 ? (
                <div className="list-card-surface p-10 text-center">
                    <div className="w-12 h-12 rounded-xl bg-lime-50 flex items-center justify-center mx-auto mb-3"><Wheat className="w-6 h-6 text-lime-300" /></div>
                    <p className="text-sm font-semibold text-gray-500">No crops found</p>
                </div>
            ) : (
                <div className="list-grid">
                    {filtered.map((c, i) => (
                        <div key={c.id || i} className="list-card-surface p-3.5 group card-hover">
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="w-9 h-9 rounded-lg bg-lime-100 flex items-center justify-center text-lime-600">
                                    <Leaf className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="list-card-title">{c.name}</p>
                                    {c.variety && <p className="list-card-meta truncate">{c.variety}</p>}
                                </div>
                            </div>
                            {c.description && <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{c.description}</p>}
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                                {c.is_active !== false && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                                    </span>
                                )}
                                {c.season && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                        {c.season}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
