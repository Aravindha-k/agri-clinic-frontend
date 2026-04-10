import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getVisitDetail } from "../api/visit.api";
import api from "../api/axios";
import {
    ArrowLeft,
    ClipboardCheck,
    User,
    MapPin,
    Leaf,
    Calendar,
    LandPlot,
    FileText,
    Phone,
} from "lucide-react";

/* ---------- UI COMPONENTS ---------- */

const Card = ({ title, children }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-5 py-3 border-b text-sm font-semibold text-gray-700">
            {title}
        </div>
        <div className="p-5">{children}</div>
    </div>
);

const Field = ({ label, value, editable, onChange, name, type = "text" }) => {
    return (
        <div>
            <label className="text-xs text-gray-400">{label}</label>

            {editable ? (
                type === "textarea" ? (
                    <textarea
                        name={name}
                        value={value || ""}
                        onChange={onChange}
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                ) : (
                    <input
                        type={type}
                        name={name}
                        value={value || ""}
                        onChange={onChange}
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                )
            ) : (
                <p className="mt-1 text-sm font-medium text-gray-800">
                    {value || "-"}
                </p>
            )}
        </div>
    );
};

/* ---------- MAIN ---------- */

export default function VisitDetail(props) {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const mode =
        props.mode ||
        (location.pathname.endsWith("/edit") ? "edit" : "view");

    const [data, setData] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!id || id === "create") return;
        const fetch = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await getVisitDetail(id);
                // Accept both {data: {...}} and {...} shapes
                let d = res?.data?.data || res?.data || res;
                // Defensive: if d is not an object, set to null
                if (!d || typeof d !== 'object' || Array.isArray(d)) d = null;
                setData(d);
                setFormData(d || {});
            } catch (err) {
                setError("Failed to load visit details");
                setData(null);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((p) => ({ ...p, [name]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.patch(`/visits/${id}/`, formData);
            navigate(`/visits/${id}`);
        } catch (err) {
            setError("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 text-center"><span className="loader" /> Loading...</div>;
    if (error) return <div className="p-10 text-center text-red-500">{error}</div>;
    if (!data || Object.keys(data).length === 0) return <div className="p-10 text-center">No data found.</div>;

    const v = mode === "edit" ? formData : data;

    return (
        <div className="p-6 bg-gray-50 min-h-screen space-y-6">
            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate("/visits")}
                        className="p-2 bg-white rounded-lg border"
                    >
                        <ArrowLeft size={18} />
                    </button>

                    <div>
                        <h1 className="text-xl font-bold">Visit Detail</h1>
                        <p className="text-sm text-gray-500">
                            {v.visit_date || "-"}
                        </p>
                    </div>
                </div>

                {mode === "view" ? (
                    <button
                        onClick={() => navigate(`/visits/${id}/edit`)}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg"
                    >
                        Edit
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button
                            onClick={() => navigate(`/visits/${id}`)}
                            className="px-4 py-2 border rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg"
                        >
                            {saving ? "Saving..." : "Save"}
                        </button>
                    </div>
                )}
            </div>

            {/* GRID */}
            <div className="grid md:grid-cols-2 gap-6">

                {/* FARMER */}
                <Card title="Farmer Info">
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Name" name="farmer_name" value={v?.farmer_name} editable={mode === "edit"} onChange={handleChange} />
                        <Field label="Phone" name="farmer_phone" value={v?.farmer_phone} editable={mode === "edit"} onChange={handleChange} />
                        <Field label="Village" name="village_name" value={v?.village_name} editable={mode === "edit"} onChange={handleChange} />
                        <Field label="District" name="district_name" value={v?.district_name} editable={mode === "edit"} onChange={handleChange} />
                    </div>
                </Card>

                {/* FIELD */}
                <Card title="Field Info">
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Land Name" name="land_name" value={v?.land_name} editable={mode === "edit"} onChange={handleChange} />
                        <Field label="Area" name="land_area" value={v?.land_area} editable={mode === "edit"} onChange={handleChange} />
                    </div>
                </Card>

                {/* CROP */}
                <Card title="Crop Info">
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Crop" name="crop_name" value={v?.crop_name} editable={mode === "edit"} onChange={handleChange} />
                        <Field label="Stage" name="crop_stage" value={v?.crop_stage} editable={mode === "edit"} onChange={handleChange} />
                    </div>
                </Card>

                {/* VISIT */}
                <Card title="Visit Info">
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Date" name="visit_date" value={v?.visit_date} editable={mode === "edit"} onChange={handleChange} />
                        <Field label="Status" name="status" value={v?.status} editable={mode === "edit"} onChange={handleChange} />
                    </div>
                </Card>

                {/* NOTES */}
                <Card title="Notes & Advice">
                    <div className="space-y-4">
                        <Field label="Notes" name="notes" value={v?.notes} editable={mode === "edit"} onChange={handleChange} type="textarea" />
                        <Field label="Fertilizer" name="fertilizer_advice" value={v?.fertilizer_advice} editable={mode === "edit"} onChange={handleChange} />
                        <Field label="Pesticide" name="pesticide_advice" value={v?.pesticide_advice} editable={mode === "edit"} onChange={handleChange} />
                    </div>
                </Card>

            </div>
        </div>
    );
}