import { useEffect, useState } from "react";
import { fetchAllMasterCrops } from "../../api/master.api";
import { Leaf, ChevronDown } from "lucide-react";

export default function CropDropdown({ value, onChange, label = "Crop", className = "" }) {
    const [crops, setCrops] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const page = await fetchAllMasterCrops();
                setCrops(page.results || []);
            } catch { /* silent */ }
            finally { setLoading(false); }
        })();
    }, []);

    const selectClass = "select";

    return (
        <div className={className}>
            <label className="form-label flex items-center gap-1">
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
