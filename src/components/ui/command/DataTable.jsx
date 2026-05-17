import EmptyState from "./EmptyState";

export default function DataTable({
  columns,
  rows,
  onRowClick,
  emptyIcon,
  emptyTitle = "No records found",
  emptySubtitle,
  emptyAction,
  loading,
  skeletonRows = 6,
  className = "",
}) {
  if (loading) {
    return (
      <div className={`section-card overflow-hidden ${className}`}>
        <div className="table-container animate-pulse">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: skeletonRows }).map((_, r) => (
                <tr key={r}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      <div className="skeleton h-4 w-full max-w-[120px]" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <div className={`section-card ${className}`}>
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          subtitle={emptySubtitle}
          action={emptyAction}
        />
      </div>
    );
  }

  return (
    <div className={`section-card overflow-hidden ${className}`}>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.thClassName}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id ?? i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? "cursor-pointer" : ""}
              >
                {columns.map((col) => (
                  <td key={col.key} className={col.tdClassName}>
                    {col.render ? col.render(row, i) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
