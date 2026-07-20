import { PageLoader, PageHeader } from "../components/ui/command";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, AlertCircle } from "lucide-react";
import FarmerForm from "./FarmerForm";
import { getFarmerDetail } from "../api/farmer.api";
import { createFarmer as createMasterFarmer, updateFarmer as updateMasterFarmer } from "../api/master.api";
import { normalizeFarmerFormError } from "../utils/apiErrorNormalize";

const resolveObject = (payload) => {
    const raw = payload?.data ?? payload;
    if (raw?.data && typeof raw.data === "object" && !Array.isArray(raw.data)) return raw.data;
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
            .catch(() => {
                if (active) setError("Failed to load farmer details.");
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
            const saved = isEdit ? await updateMasterFarmer(id, payload) : await createMasterFarmer(payload);
            const farmer = resolveObject(saved);
            navigate(`/farmers/${farmer?.id ?? farmer?.phone ?? id ?? ""}`.replace(/\/$/, ""));
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
