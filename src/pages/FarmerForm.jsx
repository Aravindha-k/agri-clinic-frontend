import { useState } from "react";
import { User, Phone, Loader2 } from "lucide-react";
import LocationSelector from "../components/ui/LocationSelector";

const inputClass = "w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all";

export default function FarmerForm({ initial = {}, onSubmit, onCancel, loading = false }) {
    const [form, setForm] = useState({
        name: initial.name || initial.farmer_name || "",
        phone: initial.phone || initial.mobile || "",
        district: initial.district || initial.district_id || "",
        district_name: initial.district_name || "",
        village: initial.village || initial.village_id || "",
        village_name: initial.village_name || "",
        total_area: initial.total_area || "",
    });

    const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

    const handleLocationChange = (loc) => {
        setForm((f) => ({ ...f, ...loc }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            name: form.name,
            phone: form.phone,
            district: form.district || undefined,
            village: form.village || undefined,
            total_area: form.total_area || undefined,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                    <User className="w-3 h-3" /> Farmer Name *
                </label>
                <input type="text" required value={form.name} onChange={(e) => set("name", e.target.value)}
                    placeholder="Enter farmer name" className={inputClass} />
            </div>

            {/* Phone */}
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Phone Number
                </label>
                <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)}
                    placeholder="Enter phone number" className={inputClass} />
            </div>

            {/* Location Cascading Dropdowns */}
            <div>
                <p className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wider">Location</p>
                <LocationSelector
                    value={{ district: form.district, village: form.village }}
                    onChange={handleLocationChange}
                />
            </div>

            {/* Total Area */}
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Total Area (acres)</label>
                <input type="number" step="0.01" min="0" value={form.total_area} onChange={(e) => set("total_area", e.target.value)}
                    placeholder="e.g. 5.5" className={inputClass} />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <button type="submit" disabled={loading || !form.name.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm disabled:opacity-50">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {initial.id ? "Update" : "Create"} Farmer
                </button>
                {onCancel && (
                    <button type="button" onClick={onCancel}
                        className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all">
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
}
