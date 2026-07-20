import { useState } from "react";
import { User, Phone, Loader2 } from "lucide-react";
import LocationSelector from "../components/ui/LocationSelector";
import ProfilePhotoUpload from "../components/ui/ProfilePhotoUpload";
import { uploadFarmerPhoto } from "../api/farmer.api";

const inputClass = "input";

export default function FarmerForm({
    initial = {},
    onSubmit,
    onCancel,
    loading = false,
    farmerId,
    onPhotoUpdated,
    fieldErrors = {},
}) {
    const [form, setForm] = useState({
        name: initial.name || initial.farmer_name || "",
        phone: initial.phone || initial.mobile || "",
        district: initial.district || initial.district_id || "",
        district_name: initial.district_name || "",
        village: initial.village || initial.village_id || "",
        village_name: initial.village_name || "",
        total_land_area: initial.total_land_area || initial.total_area || "",
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
            total_land_area: form.total_land_area || undefined,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {farmerId && (
                <div className="pb-4 border-b border-gray-100 flex justify-center">
                    <ProfilePhotoUpload
                        entity={initial}
                        displayName={form.name || "Farmer"}
                        size="xl"
                        variant="teal"
                        onUpload={(file) => uploadFarmerPhoto(farmerId, file)}
                        onPhotoUpdated={onPhotoUpdated}
                    />
                </div>
            )}
            {/* Name */}
            <div>
                <label className="form-label flex items-center gap-1">
                    <User className="w-3 h-3" /> Farmer Name *
                </label>
                <input type="text" required value={form.name} onChange={(e) => set("name", e.target.value)}
                    placeholder="Enter farmer name" className={inputClass} />
            </div>

            {/* Phone */}
            <div>
                <label className="form-label flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Phone Number
                </label>
                <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="Enter phone number"
                    className={`${inputClass}${fieldErrors.phone ? " border-red-400" : ""}`}
                    aria-invalid={Boolean(fieldErrors.phone)}
                />
                {fieldErrors.phone ? (
                    <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.phone}</p>
                ) : null}
            </div>

            {/* Location Cascading Dropdowns */}
            <div>
                <p className="form-label uppercase tracking-wider">Location</p>
                <LocationSelector
                    value={{ district: form.district, village: form.village }}
                    onChange={handleLocationChange}
                />
            </div>

            {/* Total Area */}
            <div>
                <label className="form-label">Total Area (acres)</label>
                <input type="number" step="0.01" min="0" value={form.total_land_area} onChange={(e) => set("total_land_area", e.target.value)}
                    placeholder="e.g. 5.5" className={inputClass} />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <button type="submit" disabled={loading || !form.name.trim()} className="btn btn-primary btn-md">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {initial.id ? "Update" : "Create"} Farmer
                </button>
                {onCancel && (
                    <button type="button" onClick={onCancel} className="btn btn-secondary btn-md">
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
}
