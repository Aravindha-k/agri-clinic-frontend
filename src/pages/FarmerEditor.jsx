import { PageLoader, PageHeader } from "../components/ui/command";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, AlertCircle } from "lucide-react";
import FarmerForm from "./FarmerForm";
import { getFarmerDetail, createFarmer, updateFarmer } from "../api/farmer.api";
import { normalizeFarmerFormError } from "../utils/apiErrorNormalize";

const resolveObject = (payload) => {
    const raw = payload?.data ?? payload;
    if (raw?.data && typeof raw.data === "object" && !Array.isArray(raw.data) && raw.id == null && raw.name == null) {
        return raw.data;
    }
    if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw;
    return null;
};

export default function FarmerEditor({ mode = "create" }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = mode === "edit";
    const [initial, setInitial] = useState(null);

    const handlePhotoUpdated = (url, data) => {
        setInitial((prev) => (prev ? { ...prev, profile_photo_url: url, ...data } : prev));
    };
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => {
        if (!isEdit || !id) return;
        let active = true;
        setLoading(true);
        setError("");
        getFarmerDetail(id)
            .then((res) => {
                if (active) setInitial(resolveObject(res));
            })
            .catch((err) => {
                if (!active) return;
                const status = err?.response?.status;
                if (status === 404) setError("Farmer not found.");
                else if (status === 401 || status === 403) setError("You don't have permission to edit this farmer.");
                else setError("Failed to load farmer details.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, [id, isEdit]);

    const handleSubmit = async (payload) => {
        setSaving(true);
        setError("");
        setFieldErrors({});
        try {
            const saved = isEdit ? await updateFarmer(id, payload) : await createFarmer(payload);
            const farmer = resolveObject(saved);
            const nextId = farmer?.id ?? id;
            if (nextId) navigate(`/farmers/${nextId}`);
            else navigate("/farmers");
        } catch (err) {
            const normalized = normalizeFarmerFormError(
                err,
                `Failed to ${isEdit ? "update" : "create"} farmer.`
            );
            setError(normalized.formError);
            setFieldErrors(normalized.fieldErrors);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (<div className="page-container"><PageLoader label="Loading farmer…" /></div>);
    }

    if (isEdit && !initial && error) {
        return (
            <div className="page-container">
                <div className="alert-error">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
                </div>
            </div>
        );
    }

    return (
        <div className="page-container max-w-3xl">
            <PageHeader
                title={isEdit ? "Edit Farmer" : "Add Farmer"}
                subtitle={isEdit ? "Update farmer profile and location" : "Create a farmer profile for visit tracking"}
                actions={
                    <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary btn-md">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                }
            />

            {error && (
                <div className="alert-error">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
                </div>
            )}

            <div className="section-card p-4">
                <FarmerForm
                    key={isEdit ? `edit-${id}-${initial?.id ?? "loading"}` : "create"}
                    initial={initial || {}}
                    farmerId={isEdit ? id : undefined}
                    onPhotoUpdated={handlePhotoUpdated}
                    onSubmit={handleSubmit}
                    onCancel={() => navigate(-1)}
                    loading={saving}
                    fieldErrors={fieldErrors}
                />
            </div>
        </div>
    );
}
