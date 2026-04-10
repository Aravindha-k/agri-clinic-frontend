import { useEffect, useState, useCallback } from "react";
import {
    Clock, User, Leaf, LandPlot, Eye, AlertTriangle, FileText,
    ChevronDown, Loader2,
} from "lucide-react";

const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

const resolveList = (d) => {
    if (Array.isArray(d)) return d;
    if (d?.results) return d.results;
    if (d?.data) return d.data;
    return [];
};

const fmt = (d) => {
    if (!d) return "\u2014";
    const dt = new Date(d);
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
        " " + dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

const TYPE_CONFIG = {
    visit: { icon: Eye, bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200", label: "Visit" },
    field_added: { icon: LandPlot, bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-200", label: "Field Added" },
    crop_added: { icon: Leaf, bg: "bg-lime-50", text: "text-lime-600", border: "border-lime-200", label: "Crop Added" },
    issue: { icon: AlertTriangle, bg: "bg-red-50", text: "text-red-600", border: "border-red-200", label: "Issue Reported" },
    note: { icon: FileText, bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200", label: "Note" },
    registration: { icon: User, bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", label: "Registered" },
};

const getConfig = (type) => TYPE_CONFIG[type] || { icon: Clock, bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", label: type || "Activity" };

export default function ActivityTimeline({ fetchFn, emptyIcon: EmptyIcon = Clock, emptyText = "No activity recorded" }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);

    const load = useCallback(async (pg = 1) => {
        if (pg === 1) setLoading(true); else setLoadingMore(true);
        try {
            const raw = await fetchFn({ page: pg, page_size: 20 });
            const list = resolveList(raw);
            setItems((prev) => pg === 1 ? list : [...prev, ...list]);
            const count = raw?.count || raw?.total || 0;
            setHasMore(pg * 20 < count);
        } catch {
            // silent
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [fetchFn]);

    useEffect(() => { load(1); }, [load]);

    const loadMore = () => {
        const next = page + 1;
        setPage(next);
        load(next);
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-4 animate-pulse">
                        <div className="w-10 h-10 rounded-full bg-gray-200" />
                        <div className="flex-1 space-y-2">
                            <div className="w-32 h-4 bg-gray-200 rounded" />
                            <div className="w-48 h-3 bg-gray-100 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-12">
                <EmptyIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">{emptyText}</p>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />

            <div className="space-y-0">
                {items.map((item, i) => {
                    const cfg = getConfig(item.activity_type || item.type);
                    const Icon = cfg.icon;
                    return (
                        <div key={item.id || i} className="relative flex gap-4 py-4 group">
                            {/* Dot */}
                            <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${cfg.bg} ${cfg.border} transition-transform group-hover:scale-110`}>
                                <Icon className={`w-4 h-4 ${cfg.text}`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pt-1">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                                            {cfg.label}
                                        </span>
                                        <p className="text-sm text-gray-800 font-medium mt-1.5">
                                            {item.description || item.notes || item.title || "\u2014"}
                                        </p>
                                    </div>
                                    <p className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5">
                                        {fmt(item.created_at || item.timestamp || item.date)}
                                    </p>
                                </div>
                                {item.created_by && (
                                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                        <User className="w-3 h-3" /> {item.created_by_name || item.created_by}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Load More */}
            {hasMore && (
                <div className="text-center pt-4">
                    <button onClick={loadMore} disabled={loadingMore}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all disabled:opacity-50">
                        {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                        Load More
                    </button>
                </div>
            )}
        </div>
    );
}
