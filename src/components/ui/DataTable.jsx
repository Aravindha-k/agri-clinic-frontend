import CanonicalEmptyState from "./command/EmptyState";

export function Badge({ active, label }) {
    return (
        <span className={`badge ${active ? "badge-success" : "badge-gray"}`}>
            <span className={`status-pill__dot ${active ? "bg-emerald-500" : "bg-gray-400"}`} />
            {label || (active ? "Active" : "Disabled")}
        </span>
    );
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
    return (
        <div className="section-card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex gap-3">
                {Array.from({ length: cols }).map((_, i) => (
                    <div key={i} className="skeleton h-3 flex-1 rounded" />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="flex gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0">
                    {Array.from({ length: cols }).map((_, c) => (
                        <div key={c} className="skeleton h-3.5 flex-1 rounded" />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function EmptyState(props) {
  return <CanonicalEmptyState {...props} />;
}

export function Pagination({ page, totalPages, onPageChange }) {
    if (totalPages <= 1) return null;
    const pages = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);

    return (
        <div className="pagination-controls mt-4 justify-center">
            <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="pagination-btn"
                aria-label="Previous page"
            >
                ←
            </button>
            {start > 1 && <span className="pagination-info px-1">…</span>}
            {pages.map((p) => (
                <button
                    key={p}
                    type="button"
                    onClick={() => onPageChange(p)}
                    className={`pagination-btn ${p === page ? "pagination-btn-active" : ""}`}
                    aria-current={p === page ? "page" : undefined}
                >
                    {p}
                </button>
            ))}
            {end < totalPages && <span className="pagination-info px-1">…</span>}
            <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="pagination-btn"
                aria-label="Next page"
            >
                →
            </button>
        </div>
    );
}
