export function Badge({ active, label }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                }`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-gray-400"}`} />
            {label || (active ? "Active" : "Disabled")}
        </span>
    );
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
    return (
        <div className="animate-pulse">
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="flex gap-4 py-3 px-4 border-b border-gray-50">
                    {Array.from({ length: cols }).map((_, c) => (
                        <div key={c} className="h-4 bg-gray-200 rounded flex-1" />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function EmptyState({ icon: Icon, title, subtitle }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            {Icon && <Icon className="w-12 h-12 text-gray-300 mb-3" />}
            <p className="text-gray-500 font-medium">{title || "No data found"}</p>
            {subtitle && <p className="text-gray-400 text-sm mt-1">{subtitle}</p>}
        </div>
    );
}

export function Pagination({ page, totalPages, onPageChange }) {
    if (totalPages <= 1) return null;
    const pages = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);

    return (
        <div className="flex items-center justify-center gap-1 mt-4">
            <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm rounded-lg disabled:opacity-30 hover:bg-gray-100"
            >
                ←
            </button>
            {start > 1 && <span className="px-2 text-gray-400 text-sm">…</span>}
            {pages.map((p) => (
                <button
                    key={p}
                    onClick={() => onPageChange(p)}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium ${p === page ? "bg-emerald-600 text-white" : "hover:bg-gray-100 text-gray-600"
                        }`}
                >
                    {p}
                </button>
            ))}
            {end < totalPages && <span className="px-2 text-gray-400 text-sm">…</span>}
            <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm rounded-lg disabled:opacity-30 hover:bg-gray-100"
            >
                →
            </button>
        </div>
    );
}
