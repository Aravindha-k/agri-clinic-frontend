import { useEffect, useState } from "react";
import { getCrops } from "../../api/master.api";
import { Leaf, ChevronDown } from "lucide-react";

const resolveList = (d) => {
    const raw = d?.data ?? d;
    if (Array.isArray(raw)) return raw;
    if (raw?.results) return raw.results;
    if (raw?.data) return raw.data;
    return [];
};

export default function CropDropdown({ value, onChange, label = "Crop", className = "" }) {
    const [crops, setCrops] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const raw = await getCrops();
                setCrops(resolveList(raw));
            } catch { /* silent */ }
            finally { setLoading(false); }
        })();
    }, []);

    const selectClass = "w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all appearance-none";

    return (
        <div className={className}>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                <Leaf className="w-3 h-3" /> {label}
            </label>
            <div className="relative">
                <select value={value || ""} onChange={(e) => onChange(e.target.value)}
                    disabled={loading} className={`${selectClass} disabled:opacity-50`}>
                    <option value="">{loading ? "Loading…" : "Select Crop"}</option>
                    {crops.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}{c.variety ? ` (${c.variety})` : ""}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
        </div>
    );
}
