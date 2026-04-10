
export default function Card({ title, value, icon: Icon, accent = "#166534" }) {
  return (
    <div className="relative bg-white rounded-2xl overflow-hidden card-hover"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)" }}>
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: accent }} />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-3">
          {Icon && (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent}15`, color: accent }}>
              <Icon className="w-4.5 h-4.5" />
            </div>
          )}
          <h3 className="text-gray-500 text-[13px] font-medium">{title}</h3>
        </div>
        <p className="text-[28px] font-bold text-gray-900 leading-none tabular-nums">{value}</p>
      </div>
    </div>
  );
}
