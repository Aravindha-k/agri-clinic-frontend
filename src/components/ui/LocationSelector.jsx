import { useEffect, useState, useCallback } from "react";
import { getDistricts, getVillages } from "../../api/master.api";
import { MapPin, ChevronDown } from "lucide-react";

const resolveList = (d) => {
    const raw = d?.data ?? d;
    if (Array.isArray(raw)) return raw;
    if (raw?.results) return raw.results;
    if (raw?.data) return raw.data;
    return [];
};

export default function LocationSelector({ value = {}, onChange, className = "" }) {
    const [districts, setDistricts] = useState([]);
    const [villages, setVillages] = useState([]);
    const [loadingVillages, setLoadingVillages] = useState(false);

    // Load districts once
    useEffect(() => {
        (async () => {
            try {
                const raw = await getDistricts();
                setDistricts(resolveList(raw));
            } catch { /* silent */ }
        })();
    }, []);

    // Load villages for the selected district.
    useEffect(() => {
        if (!value.district) {
            setVillages([]);
            return;
        }
        (async () => {
            try {
                setLoadingVillages(true);
                const rawVillages = await getVillages();
                const allVillages = resolveList(rawVillages);
                const filteredVillages = allVillages.filter((v) =>
                    String(v.district) === String(value.district) ||
                    String(v.district_id) === String(value.district)
                );
                setVillages(filteredVillages.length > 0 ? filteredVillages : allVillages);
            } catch { /* silent */ }
            finally { setLoadingVillages(false); }
        })();
    }, [value.district]);

    const handleDistrictChange = (districtId) => {
        const dist = districts.find((d) => String(d.id) === String(districtId));
        onChange({
            district: districtId || "",
            district_name: dist?.name || "",
            village: "",
            village_name: "",
        });
    };

    const handleVillageChange = (villageId) => {
        const vlg = villages.find((v) => String(v.id) === String(villageId));
        onChange({
            ...value,
            village: villageId || "",
            village_name: vlg?.name || "",
        });
    };

    const selectClass = "w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all appearance-none";

    return (
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
            {/* District */}
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> District
                </label>
                <div className="relative">
                    <select value={value.district || ""} onChange={(e) => handleDistrictChange(e.target.value)} className={selectClass}>
                        <option value="">Select District</option>
                        {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* Village */}
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Village
                </label>
                <div className="relative">
                    <select value={value.village || ""} onChange={(e) => handleVillageChange(e.target.value)}
                        disabled={!value.district || loadingVillages} className={`${selectClass} disabled:opacity-50`}>
                        <option value="">{loadingVillages ? "Loading…" : "Select Village"}</option>
                        {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
            </div>
        </div>
    );
}
