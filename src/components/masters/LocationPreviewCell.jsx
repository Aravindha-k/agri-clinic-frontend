const DEFAULT_LIMITS = {
  districts: 2,
  taluks: 3,
  villages: 3,
};

function overflowNames(items, limit) {
  return (items || [])
    .slice(limit)
    .map((item) => item?.name)
    .filter(Boolean);
}

export default function LocationPreviewCell({
  items = [],
  totalCount = 0,
  limit,
  emptyLabel = "\u2014",
}) {
  const count = Number(totalCount) || 0;
  if (count === 0) {
    return <span className="emp-loc-preview-cell emp-loc-preview-cell--empty">{emptyLabel}</span>;
  }

  const maxShown = limit ?? items.length;
  const shown = (items || []).slice(0, maxShown);
  const remaining = Math.max(0, count - shown.length);
  const overflow = overflowNames(items, maxShown);
  const tooltip =
    overflow.length > 0 ? overflow.join(", ") : remaining > 0 ? `${remaining} more not shown` : undefined;

  return (
    <div className="emp-loc-preview-cell">
      {shown.map((item) => (
        <span key={item.id ?? item.name} className="emp-loc-preview-chip">
          {item.name}
        </span>
      ))}
      {remaining > 0 && (
        <span className="emp-loc-preview-more" title={tooltip}>
          +{remaining} more
        </span>
      )}
    </div>
  );
}

export { DEFAULT_LIMITS };
