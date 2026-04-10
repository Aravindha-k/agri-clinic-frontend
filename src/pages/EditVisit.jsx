import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getVisitDetail, updateVisit } from "../api/visit.api";
import { ClipboardCheck, FileText, Calendar } from "lucide-react";

/* ---------- UI COMPONENTS ---------- */

const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

const Section = ({ icon: Icon, title, accent = "emerald", children }) => (
    <div
        className="bg-white rounded-2xl overflow-hidden mb-6"
        style={{ boxShadow: SHADOW, border: "1px solid rgba(0,0,0,0.04)" }}
    >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl bg-${accent}-50 flex items-center justify-center`}>
                <Icon className={`w-4 h-4 text-${accent}-600`} />
            </div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        </div>
        <div className="p-6">{children}</div>
    </div>
);

const DetailItem = ({ label, children, span2 }) => (
    <div
        className={`bg-white rounded-xl p-4 border border-gray-100 shadow-sm ${span2 ? "col-span-2" : ""
            }`}
    >
        <span className="block text-[11px] text-gray-400 font-medium uppercase mb-1">
            {label}
        </span>
        {children}
    </div>
);

const inputStyle =
    "w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm " +
    "focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition";

/* ---------- MAIN COMPONENT ---------- */

export default function EditVisit() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        farmer_name: "",
        farmer_phone: "",
        village_name: "",
        crop_name: "",
        crop_stage: "",
        land_name: "",
        land_area: "",
        notes: "",
        fertilizer_advice: "",
        pesticide_advice: "",
        irrigation_advice: "",
        general_advice: "",
        follow_up_required: false,
        next_visit_date: "",
        status: ""
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    /* ---------- FETCH DATA ---------- */

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await getVisitDetail(id);
                const d = res.data?.data || res.data;

                setFormData({
                    farmer_name: d.farmer_name || "",
                    farmer_phone: d.farmer_phone || "",
                    village_name: d.village_name || "",
                    crop_name: d.crop_name || "",
                    crop_stage: d.crop_stage || "",
                    land_name: d.land_name || "",
                    land_area: d.land_area || "",
                    notes: d.notes || "",
                    fertilizer_advice: d.fertilizer_advice || "",
                    pesticide_advice: d.pesticide_advice || "",
                    irrigation_advice: d.irrigation_advice || "",
                    general_advice: d.general_advice || "",
                    follow_up_required: d.follow_up_required || false,
                    next_visit_date: d.next_visit_date || "",
                    status: d.status || ""
                });
            } catch (err) {
                setError("Failed to fetch visit data");
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [id]);

    /* ---------- HANDLERS ---------- */

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError("");

        try {
            await updateVisit(id, formData);
            setSuccess(true);

            setTimeout(() => {
                navigate(-1);
            }, 1200);
        } catch {
            setError("Failed to update visit");
        } finally {
            setSaving(false);
        }
    };

    /* ---------- STATES ---------- */

    if (loading)
        return <div className="p-10 text-center text-lg">Loading...</div>;

    if (error)
        return <div className="p-10 text-center text-red-600">{error}</div>;

    /* ---------- UI ---------- */

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Edit Visit</h1>
                    <p className="text-sm text-gray-500">Update visit details</p>
                </div>

                <button
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                    Back
                </button>
            </div>

            {success && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 rounded">
                    Updated successfully!
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="grid lg:grid-cols-2 gap-6">

                    {/* VISIT INFO */}
                    <Section icon={ClipboardCheck} title="Visit Info">
                        <div className="grid grid-cols-2 gap-4">
                            <DetailItem label="Farmer Name">
                                <input name="farmer_name" value={formData.farmer_name} onChange={handleChange} className={inputStyle} />
                            </DetailItem>

                            <DetailItem label="Phone">
                                <input name="farmer_phone" value={formData.farmer_phone} onChange={handleChange} className={inputStyle} />
                            </DetailItem>

                            <DetailItem label="Village">
                                <input name="village_name" value={formData.village_name} onChange={handleChange} className={inputStyle} />
                            </DetailItem>

                            <DetailItem label="Crop">
                                <input name="crop_name" value={formData.crop_name} onChange={handleChange} className={inputStyle} />
                            </DetailItem>

                            <DetailItem label="Crop Stage">
                                <input name="crop_stage" value={formData.crop_stage} onChange={handleChange} className={inputStyle} />
                            </DetailItem>

                            <DetailItem label="Field Name">
                                <input name="land_name" value={formData.land_name} onChange={handleChange} className={inputStyle} />
                            </DetailItem>

                            <DetailItem label="Field Area">
                                <input name="land_area" value={formData.land_area} onChange={handleChange} className={inputStyle} />
                            </DetailItem>

                            <DetailItem label="Notes" span2>
                                <textarea name="notes" value={formData.notes} onChange={handleChange} className={inputStyle} rows={3} />
                            </DetailItem>
                        </div>
                    </Section>

                    {/* RECOMMENDATION */}
                    <Section icon={FileText} title="Recommendation" accent="violet">
                        <div className="grid grid-cols-2 gap-4">
                            <DetailItem label="Fertilizer">
                                <input name="fertilizer_advice" value={formData.fertilizer_advice} onChange={handleChange} className={inputStyle} />
                            </DetailItem>

                            <DetailItem label="Pesticide">
                                <input name="pesticide_advice" value={formData.pesticide_advice} onChange={handleChange} className={inputStyle} />
                            </DetailItem>

                            <DetailItem label="Irrigation">
                                <input name="irrigation_advice" value={formData.irrigation_advice} onChange={handleChange} className={inputStyle} />
                            </DetailItem>

                            <DetailItem label="General Advice" span2>
                                <input name="general_advice" value={formData.general_advice} onChange={handleChange} className={inputStyle} />
                            </DetailItem>
                        </div>
                    </Section>

                    {/* FOLLOW UP */}
                    <Section icon={Calendar} title="Follow Up" accent="amber">
                        <div className="grid grid-cols-2 gap-4">
                            <DetailItem label="Follow Up Required">
                                <input type="checkbox" name="follow_up_required" checked={formData.follow_up_required} onChange={handleChange} className="w-5 h-5 accent-emerald-600" />
                            </DetailItem>

                            <DetailItem label="Next Visit">
                                <input type="date" name="next_visit_date" value={formData.next_visit_date} onChange={handleChange} className={inputStyle} />
                            </DetailItem>

                            <DetailItem label="Status">
                                <input name="status" value={formData.status} onChange={handleChange} className={inputStyle} />
                            </DetailItem>
                        </div>
                    </Section>

                </div>

                {/* SAVE BUTTON */}
                <div className="mt-6 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm"
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </form>
        </div>
    );
}