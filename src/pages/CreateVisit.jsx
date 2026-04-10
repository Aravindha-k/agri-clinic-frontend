import { useState, useEffect } from "react";
import { getCrops, createCrop } from "../api/crop.api";
import { useNavigate } from "react-router-dom";
import CustomDropdown from "../components/CustomDropdown";
import api from "../api/axios";

/* ---------- UI COMPONENTS ---------- */

const Card = ({ title, children }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-5 py-3 border-b text-sm font-semibold text-gray-700">
            {title}
        </div>
        <div className="p-5">{children}</div>
    </div>
);

const Field = ({
    label,
    name,
    value,
    onChange,
    type = "text",
    required = false,
    error,
}) => (
    <div className="mb-2">
        <label className="text-xs text-gray-700 font-medium">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {type === "textarea" ? (
            <textarea
                name={name}
                value={value}
                onChange={onChange}
                className={`w-full mt-1 px-3 py-2 rounded-lg border ${error ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-emerald-500`}
            />
        ) : (
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                className={`w-full mt-1 px-3 py-2 rounded-lg border ${error ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-emerald-500`}
            />
        )}
        {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
    </div>
);

/* ---------- MAIN COMPONENT ---------- */

export default function CreateVisit() {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [crops, setCrops] = useState([]);
    const [cropLoading, setCropLoading] = useState(false);
    const [showAddCrop, setShowAddCrop] = useState(false);
    const [newCrop, setNewCrop] = useState({ name_en: "", name_ta: "" });
    const [addCropError, setAddCropError] = useState("");
    const [addCropSuccess, setAddCropSuccess] = useState("");
    // Remove cropSearch, not needed for custom dropdown

    const [formData, setFormData] = useState({
        farmer_name: "",
        farmer_phone: "",
        district: null,
        village: null,
        latitude: "",
        longitude: "",
        address: "",
        land_name: "",
        land_area: "",
        crop: "",
        crop_stage: "",
        crop_health: "Good",
        pest_issue: false,
        disease_issue: false,
        weed_condition: "",
        notes: "",
        fertilizer_advice: "",
        pesticide_advice: "",
        irrigation_advice: "",
        general_advice: "",
        follow_up_required: false,
        next_visit_date: "",
        visit_date: "",
        visit_time: "",
        status: "completed",
    });

    // District/Village state
    const [districts, setDistricts] = useState([]);
    const [villages, setVillages] = useState([]);
    const [districtLoading, setDistrictLoading] = useState(false);
    const [villageLoading, setVillageLoading] = useState(false);
    // Fetch districts on mount
    useEffect(() => {
        setDistrictLoading(true);
        api.get("masters/districts/")
            .then(res => {
                console.log("Districts API response:", res.data);
                setDistricts(Array.isArray(res.data?.results) ? res.data.results : []);
            })
            .catch(() => setDistricts([]))
            .finally(() => setDistrictLoading(false));
    }, []);

    // Fetch villages when district changes
    useEffect(() => {
        if (!formData.district) {
            setVillages([]);
            setFormData(f => ({ ...f, village: null }));
            return;
        }
        setVillageLoading(true);
        api.get(`masters/villages/?district_id=${formData.district}`)
            .then(res => {
                console.log("Villages API response:", res.data);
                setVillages(Array.isArray(res.data?.results) ? res.data.results : []);
            })
            .catch(() => setVillages([]))
            .finally(() => setVillageLoading(false));
    }, [formData.district]);
    // Fetch crops on load
    useEffect(() => {
        setCropLoading(true);
        getCrops()
            .then(res => {
                // Support both .results and array direct
                if (res?.results) setCrops(res.results);
                else if (Array.isArray(res)) setCrops(res);
                else setCrops([]);
            })
            .catch((err) => {
                console.error("Failed to load crops", err);
                setCrops([]);
            })
            .finally(() => setCropLoading(false));
    }, []);

    // Add Crop Handler
    const handleAddCrop = async (e) => {
        e.preventDefault();
        setAddCropError("");
        setAddCropSuccess("");
        if (!newCrop.name_en.trim() || !newCrop.name_ta.trim()) {
            setAddCropError("Both names are required");
            return;
        }
        // Prevent duplicate (case-insensitive)
        if (crops.some(c => c.name.toLowerCase() === newCrop.name_en.trim().toLowerCase())) {
            setAddCropError("Crop already exists");
            return;
        }
        try {
            await createCrop(newCrop);
            setAddCropSuccess("Crop added!");
            setNewCrop({ name_en: "", name_ta: "" });
            setCropLoading(true);
            // Refresh crop list
            const res = await getCrops();
            setCrops(res.data);
        } catch {
            setAddCropError("Failed to add crop");
        } finally {
            setCropLoading(false);
            setTimeout(() => {
                setAddCropSuccess("");
                setShowAddCrop(false);
            }, 1000);
        }
    };

    // --- Validation ---
    const [errors, setErrors] = useState({});

    const requiredFields = [
        "farmer_name",
        "farmer_phone",
        "district",
        "village",
        "visit_date",
        "visit_time",
        "land_name",
        "crop",
    ];

    const validate = () => {
        const newErrors = {};
        requiredFields.forEach((field) => {
            if (!formData[field] || formData[field].toString().trim() === "") {
                newErrors[field] = "Required";
            }
        });
        return newErrors;
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
        setErrors((prev) => ({ ...prev, [name]: undefined }));
    };

    const isFormValid = () => {
        return requiredFields.every((field) => formData[field] && formData[field].toString().trim() !== "");
    };

    const handleSubmit = async () => {
        const validationErrors = validate();
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;
        try {
            setLoading(true);
            const payload = {
                ...formData,
                district_id: formData.district,
                village_id: formData.village,
                crop: formData.crop,
            };
            await api.post("/visits/", payload);
            navigate("/visits");
        } catch (err) {
            setErrors({ submit: "Failed to create visit" });
        } finally {
            setLoading(false);
        }
    };

    /* ---------- UI ---------- */

    return (
        <div className="p-6 bg-gray-50 min-h-screen space-y-6">

            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold">Create Visit</h1>
                    <p className="text-sm text-gray-500">
                        Add a new field visit
                    </p>
                </div>

                <button
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 border rounded-lg"
                >
                    Back
                </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">

                {/* FARMER */}
                <Card title="Farmer Info">
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Name" name="farmer_name" value={formData.farmer_name} onChange={handleChange} required error={errors.farmer_name} />
                        <Field label="Phone" name="farmer_phone" value={formData.farmer_phone} onChange={handleChange} required error={errors.farmer_phone} />
                        <div>
                            <label className="text-xs text-gray-700 font-medium mb-2 block">District <span className="text-red-500">*</span></label>
                            <CustomDropdown
                                options={districts}
                                value={formData.district}
                                onChange={id => setFormData(f => ({ ...f, district: id, village: null }))}
                                valueKey="id"
                                labelKey="name"
                                placeholder={districtLoading ? "Loading districts..." : "Select District"}
                                disabled={districtLoading || districts.length === 0}
                            />
                            {errors.district && <div className="text-xs text-red-500 mt-1">{errors.district}</div>}
                        </div>
                        <div>
                            <label className="text-xs text-gray-700 font-medium mb-2 block">Village <span className="text-red-500">*</span></label>
                            <CustomDropdown
                                options={villages}
                                value={formData.village}
                                onChange={id => setFormData(f => ({ ...f, village: id }))}
                                valueKey="id"
                                labelKey="name"
                                placeholder={villageLoading ? "Loading villages..." : "Select Village"}
                                disabled={villageLoading || villages.length === 0}
                            />
                            {errors.village && <div className="text-xs text-red-500 mt-1">{errors.village}</div>}
                        </div>
                    </div>
                </Card>

                {/* LOCATION */}
                <Card title="Location">
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Latitude" name="latitude" value={formData.latitude} onChange={handleChange} />
                        <Field label="Longitude" name="longitude" value={formData.longitude} onChange={handleChange} />
                        <Field label="Address" name="address" value={formData.address} onChange={handleChange} />
                    </div>
                </Card>

                {/* FIELD */}
                <Card title="Field Info">
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Land Name" name="land_name" value={formData.land_name} onChange={handleChange} required error={errors.land_name} />
                        <Field label="Area" name="land_area" value={formData.land_area} onChange={handleChange} />
                    </div>
                </Card>

                {/* CROP */}
                <Card title="Crop Info">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="mb-2">
                            <label className="text-xs text-gray-700 font-medium mb-2 block">
                                Crop <span className="text-red-500">*</span>
                            </label>
                            <CustomDropdown
                                options={crops}
                                value={formData.crop}
                                onChange={id => setFormData(f => ({ ...f, crop: id }))}
                                valueKey="id"
                                labelKey="name_en"
                                placeholder={cropLoading ? "Loading crops..." : "Select Crop"}
                                disabled={cropLoading || crops.length === 0}
                            />
                            <div className="flex justify-end mt-1">
                                <button type="button" className="text-emerald-600 text-xs underline" onClick={() => setShowAddCrop(true)}>
                                    + Add Crop
                                </button>
                            </div>
                            {cropLoading && <div className="text-xs text-gray-400 mt-1">Loading crops...</div>}
                            {errors.crop && <div className="text-xs text-red-500 mt-1">{errors.crop}</div>}
                        </div>
                        {/* Add Crop Modal */}
                        {showAddCrop && (
                            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                                <div className="bg-white rounded-lg p-6 w-80 shadow-lg">
                                    <h3 className="font-semibold mb-2">Add Crop</h3>
                                    <form onSubmit={handleAddCrop}>
                                        <input
                                            className="w-full mb-2 px-3 py-2 border rounded"
                                            placeholder="English Name"
                                            value={newCrop.name_en}
                                            onChange={e => setNewCrop({ ...newCrop, name_en: e.target.value })}
                                            autoFocus
                                        />
                                        <input
                                            className="w-full mb-2 px-3 py-2 border rounded"
                                            placeholder="Tamil Name"
                                            value={newCrop.name_ta}
                                            onChange={e => setNewCrop({ ...newCrop, name_ta: e.target.value })}
                                        />
                                        {addCropError && <div className="text-xs text-red-500 mb-2">{addCropError}</div>}
                                        {addCropSuccess && <div className="text-xs text-emerald-600 mb-2">{addCropSuccess}</div>}
                                        <div className="flex gap-2 justify-end">
                                            <button type="button" className="px-3 py-1 text-gray-600" onClick={() => setShowAddCrop(false)}>Cancel</button>
                                            <button type="submit" className="px-3 py-1 bg-emerald-600 text-white rounded">Add</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                        <Field label="Stage" name="crop_stage" value={formData.crop_stage} onChange={handleChange} />
                        <Field label="Health" name="crop_health" value={formData.crop_health} onChange={handleChange} />
                    </div>
                </Card>

                {/* NOTES */}
                <Card title="Notes & Advice">
                    <div className="space-y-4">
                        <Field label="Notes" name="notes" value={formData.notes} onChange={handleChange} type="textarea" />
                        <Field label="Fertilizer" name="fertilizer_advice" value={formData.fertilizer_advice} onChange={handleChange} />
                        <Field label="Pesticide" name="pesticide_advice" value={formData.pesticide_advice} onChange={handleChange} />
                        <Field label="Irrigation" name="irrigation_advice" value={formData.irrigation_advice} onChange={handleChange} />
                    </div>
                </Card>

                {/* VISIT */}
                <Card title="Visit Info">
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Date" name="visit_date" value={formData.visit_date} onChange={handleChange} type="date" required error={errors.visit_date} />
                        <Field label="Time" name="visit_time" value={formData.visit_time} onChange={handleChange} type="time" required error={errors.visit_time} />
                        <Field label="Status" name="status" value={formData.status} onChange={handleChange} />
                    </div>
                </Card>

            </div >

            {/* ACTIONS */}
            < div className="flex justify-end gap-3" >
                <button
                    onClick={() => navigate(-1)}
                    className="px-5 py-2 border rounded-lg"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={loading || !isFormValid()}
                    className={`px-6 py-2 rounded-lg text-white ${loading || !isFormValid() ? 'bg-gray-300' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                    {loading ? "Creating..." : "Create Visit"}
                </button>
                {errors.submit && <div className="text-red-500 text-sm mt-2">{errors.submit}</div>}
            </div >

        </div >
    );
}