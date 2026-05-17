export default function Timeline({ items = [], className = "" }) {
  if (!items.length) return null;
  return (
    <ul className={`space-y-0 ${className}`}>
      {items.map((item, i) => (
        <li
          key={item.id ?? i}
          className="relative pl-7 pb-4 border-l-2 border-emerald-100 ml-1 last:pb-0"
        >
          <span
            className={`absolute left-[-5px] top-2 w-2.5 h-2.5 rounded-full ring-2 ring-white ${item.dotClass || "bg-emerald-500"}`}
          />
          {item.label && (
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
              {item.label}
            </p>
          )}
          <p className="text-sm font-semibold text-slate-900 mt-0.5">{item.value}</p>
          {item.hint && <p className="text-xs text-slate-400 mt-0.5">{item.hint}</p>}
        </li>
      ))}
    </ul>
  );
}
