import { PageLoader, PageHeader, ErrorRetry } from "../components/ui/command";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getVisitDetail, updateVisit } from "../api/visit.api";
import ProblemMultiSelect from "../components/visits/ProblemMultiSelect";
import { resolveVisitCropDisplay, VISIT_NOT_ADDED } from "../utils/visitDisplay";
import {
  buildVisitProblemUpdatePayload,
  extractProblemItemIdsFromVisit,
  resolveVisitCropId,
} from "../utils/createVisitForm";
import { ClipboardCheck, FileText, Calendar, ChevronLeft, Stethoscope } from "lucide-react";

/* ---------- UI COMPONENTS ---------- */

const Section = ({ icon: Icon, title, accent = "emerald", children }) => (
  <div className="enterprise-section">
    <div className="enterprise-section__header">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`icon-box icon-box--${accent}`}>
          <Icon className="w-4 h-4" aria-hidden="true" />
        </div>
        <h2 className="section-title">{title}</h2>
      </div>
    </div>
    <div className="enterprise-section__body">{children}</div>
  </div>
);

const DetailItem = ({ label, children, span2 }) => (
  <div className={`detail-item ${span2 ? "col-span-2" : ""}`}>
    <span className="detail-item__label">{label}</span>
    <div className="detail-item__value">{children}</div>
  </div>
);

/* ---------- MAIN COMPONENT ---------- */

export default function EditVisit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [originalCropId, setOriginalCropId] = useState(null);
  const [formData, setFormData] = useState({
    farmer_name: "",
    farmer_phone: "",
    village_name: "",
    crop_name: "",
    crop_stage: "",
    land_name: "",
    land_area: "",
    notes: "",
    field_notes: "",
    problem_seen: "",
    action_taken: "",
    fertilizer_advice: "",
    pesticide_advice: "",
    irrigation_advice: "",
    general_advice: "",
    follow_up_required: false,
    next_visit_date: "",
    problem_item_ids: [],
    crop_id: null,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await getVisitDetail(id);
      const d = res?.data?.data || res?.data || res || {};

      const cropId = resolveVisitCropId(d);
      setOriginalCropId(cropId);

      setFormData({
        farmer_name: d.farmer_name || "",
        farmer_phone: d.farmer_phone || "",
        village_name: d.village_name || "",
        crop_name:
          d.crop_name ||
          (resolveVisitCropDisplay(d) !== VISIT_NOT_ADDED
            ? resolveVisitCropDisplay(d)
            : ""),
        crop_id: cropId,
        crop_stage: d.crop_stage || "",
        land_name: d.land_name || "",
        land_area: d.land_area || "",
        notes: d.notes || "",
        field_notes: d.field_notes || d.observation || "",
        problem_seen: d.problem_seen || "",
        problem_item_ids: extractProblemItemIdsFromVisit(d),
        action_taken: d.action_taken || "",
        fertilizer_advice: d.fertilizer_advice || "",
        pesticide_advice: d.pesticide_advice || "",
        irrigation_advice: d.irrigation_advice || "",
        general_advice: d.general_advice || "",
        follow_up_required: d.follow_up_required || false,
        next_visit_date: d.next_visit_date || "",
      });
    } catch {
      setLoadError("Failed to fetch visit data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when visit id changes
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = buildVisitProblemUpdatePayload(formData, {
        originalCropId,
      });
      await updateVisit(id, payload);
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

  if (loading) {
    return (
      <div className="page-container">
        <PageLoader label="Loading visit…" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page-container">
        <PageHeader
          title="Edit Visit"
          subtitle="Update visit details"
          actions={
            <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary btn-md">
              <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Back
            </button>
          }
        />
        <ErrorRetry message={loadError} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div className="page-container page-container--form max-w-5xl">
      <PageHeader
        title="Edit Visit"
        subtitle="Update visit details and field observations"
        actions={
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary btn-md">
            <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Back
          </button>
        }
      />

      {success && (
        <div className="enterprise-banner mb-4" role="status">
          <span className="enterprise-banner__dot" aria-hidden="true" />
          <p className="text-sm text-emerald-700 font-medium">Updated successfully</p>
        </div>
      )}

      {error && <ErrorRetry compact message={error} className="mb-4" />}

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-2 gap-4">
          <Section icon={ClipboardCheck} title="Visit Info">
            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="Farmer Name">
                <input name="farmer_name" value={formData.farmer_name} onChange={handleChange} className="input" />
              </DetailItem>

              <DetailItem label="Phone">
                <input name="farmer_phone" value={formData.farmer_phone} onChange={handleChange} className="input" />
              </DetailItem>

              <DetailItem label="Village">
                <input name="village_name" value={formData.village_name} onChange={handleChange} className="input" />
              </DetailItem>

              <DetailItem label="Crop">
                <input name="crop_name" value={formData.crop_name} onChange={handleChange} className="input" />
              </DetailItem>

              <DetailItem label="Crop Stage">
                <input name="crop_stage" value={formData.crop_stage} onChange={handleChange} className="input" />
              </DetailItem>

              <DetailItem label="Field Name">
                <input name="land_name" value={formData.land_name} onChange={handleChange} className="input" />
              </DetailItem>

              <DetailItem label="Field Area">
                <input name="land_area" value={formData.land_area} onChange={handleChange} className="input" />
              </DetailItem>

              <DetailItem label="Notes" span2>
                <textarea name="notes" value={formData.notes} onChange={handleChange} className="input" rows={3} />
              </DetailItem>
            </div>
          </Section>

          <Section icon={FileText} title="Observation / Field Notes" accent="sky">
            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="Observation / Field Notes" span2>
                <textarea name="field_notes" value={formData.field_notes} onChange={handleChange} className="input" rows={3} />
              </DetailItem>

              <DetailItem label="Employee observation (free text)" span2>
                <textarea name="problem_seen" value={formData.problem_seen} onChange={handleChange} className="input" rows={2} />
              </DetailItem>

              <DetailItem label="Action Taken" span2>
                <textarea name="action_taken" value={formData.action_taken} onChange={handleChange} className="input" rows={2} />
              </DetailItem>

              <DetailItem label="Fertilizer">
                <input name="fertilizer_advice" value={formData.fertilizer_advice} onChange={handleChange} className="input" />
              </DetailItem>

              <DetailItem label="Pesticide">
                <input name="pesticide_advice" value={formData.pesticide_advice} onChange={handleChange} className="input" />
              </DetailItem>

              <DetailItem label="Irrigation">
                <input name="irrigation_advice" value={formData.irrigation_advice} onChange={handleChange} className="input" />
              </DetailItem>

              <DetailItem label="General Advice" span2>
                <input name="general_advice" value={formData.general_advice} onChange={handleChange} className="input" />
              </DetailItem>
            </div>
          </Section>

          <Section icon={Stethoscope} title="Problems identified" accent="violet">
            <DetailItem label="Structured problems" span2>
              <ProblemMultiSelect
                cropId={formData.crop_id}
                value={formData.problem_item_ids}
                onChange={(ids) =>
                  setFormData((prev) => ({ ...prev, problem_item_ids: ids }))
                }
              />
            </DetailItem>
          </Section>

          <Section icon={Calendar} title="Follow Up" accent="amber">
            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="Follow Up Required">
                <input
                  type="checkbox"
                  name="follow_up_required"
                  checked={formData.follow_up_required}
                  onChange={handleChange}
                  className="w-5 h-5 accent-emerald-600"
                />
              </DetailItem>

              <DetailItem label="Next Visit">
                <input type="date" name="next_visit_date" value={formData.next_visit_date} onChange={handleChange} className="input" />
              </DetailItem>
            </div>
          </Section>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary btn-md" disabled={saving}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn btn-primary btn-md">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
