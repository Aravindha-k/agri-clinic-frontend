import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import CustomDropdown from "../components/CustomDropdown";
import VisitMediaUploadField from "../components/visits/VisitMediaUploadField";
import LocationSelector from "../components/ui/LocationSelector";
import { PageHeader, ErrorRetry } from "../components/ui/command";
import ProblemMultiSelect from "../components/visits/ProblemMultiSelect";
import { fetchAllCrops } from "../api/crop.api";
import { fetchAllFarmers } from "../api/farmer.api";
import { createVisit, uploadVisitAttachment } from "../api/visit.api";
import {
  farmerRecordToVisitForm,
  farmersToDropdownOptions,
} from "../utils/farmerFormMapping";
import {
  validateCreateVisitForm,
  buildCreateVisitPayload,
} from "../utils/createVisitForm";
import { ChevronLeft, Loader2 } from "lucide-react";

const EMPTY_FORM = {
  farmer_mode: "new",
  farmer_id: null,
  farmer_name: "",
  farmer_phone: "",
  district: "",
  district_name: "",
  taluk: "",
  taluk_name: "",
  village: "",
  village_name: "",
  crop: null,
  land_area: "",
  problem_item_ids: [],
  problem_description: "",
};

const Field = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  error,
  placeholder,
  children,
}) => (
  <div className="create-visit-field">
    <label className="form-label" htmlFor={name || undefined}>
      {label}
      {required ? <span className="form-required" aria-hidden="true"> *</span> : null}
    </label>
    {children ??
      (type === "textarea" ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={4}
          className={`input${error ? " input--error" : ""}`}
          aria-invalid={Boolean(error)}
        />
      ) : (
        <input
          id={name}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`input${error ? " input--error" : ""}`}
          aria-invalid={Boolean(error)}
        />
      ))}
    {error ? <p className="form-error">{error}</p> : null}
  </div>
);

const SectionCard = ({ title, subtitle, children }) => (
  <section className="enterprise-section create-visit-section">
    <div className="enterprise-section__header">
      <div className="min-w-0">
        <h2 className="section-title">{title}</h2>
        {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
      </div>
    </div>
    <div className="enterprise-section__body">{children}</div>
  </section>
);

const ModeToggle = ({ value, onChange }) => (
  <div className="create-visit-mode" role="group" aria-label="Farmer mode">
    {[
      { id: "existing", label: "Existing farmer" },
      { id: "new", label: "New farmer" },
    ].map((opt) => (
      <button
        key={opt.id}
        type="button"
        onClick={() => onChange(opt.id)}
        className={`create-visit-mode__btn${value === opt.id ? " create-visit-mode__btn--active" : ""}`}
        aria-pressed={value === opt.id}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export default function CreateVisit() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  const [crops, setCrops] = useState([]);
  const [mediaFiles, setMediaFiles] = useState([]);

  const [farmers, setFarmers] = useState([]);
  const [farmerOptions, setFarmerOptions] = useState([]);
  const [farmersLoading, setFarmersLoading] = useState(true);
  const [cropLoading, setCropLoading] = useState(true);

  const isExistingFarmer = form.farmer_mode === "existing";
  const locationDefaultDistrict = isExistingFarmer ? null : "Villupuram";

  useEffect(() => {
    setCropLoading(true);
    fetchAllCrops()
      .then((page) => setCrops(page.results || []))
      .catch(() => setCrops([]))
      .finally(() => setCropLoading(false));

    setFarmersLoading(true);
    fetchAllFarmers()
      .then((page) => {
        const list = page.results ?? [];
        setFarmers(list);
        setFarmerOptions(farmersToDropdownOptions(list));
      })
      .catch(() => {
        setFarmers([]);
        setFarmerOptions([]);
      })
      .finally(() => setFarmersLoading(false));
  }, []);

  const preselectFarmerId = location.state?.farmerId;
  useEffect(() => {
    if (!preselectFarmerId || !farmers.length) return;
    const farmer = farmers.find((f) => f.id === preselectFarmerId);
    if (!farmer) return;
    const mapped = farmerRecordToVisitForm(farmer);
    if (!mapped) return;
    setForm((prev) => ({
      ...prev,
      farmer_mode: "existing",
      ...mapped,
    }));
  }, [preselectFarmerId, farmers]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setField(name, value);
  };

  const handleLocationChange = (loc) => {
    setForm((prev) => ({
      ...prev,
      district: loc.district || "",
      district_name: loc.district_name || "",
      taluk: loc.taluk || "",
      taluk_name: loc.taluk_name || "",
      village: loc.village || "",
      village_name: loc.village_name || "",
    }));
    setErrors((prev) => ({ ...prev, village: undefined }));
  };

  const setFarmerMode = (mode) => {
    setForm({ ...EMPTY_FORM, farmer_mode: mode });
    setErrors({});
  };

  const selectExistingFarmer = (farmerId) => {
    const farmer = farmers.find((f) => f.id === farmerId);
    const mapped = farmerRecordToVisitForm(farmer);
    if (!mapped) {
      setField("farmer_id", farmerId);
      return;
    }
    setForm((prev) => ({
      ...prev,
      farmer_mode: "existing",
      ...mapped,
    }));
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setSubmitError("");

    const validation = validateCreateVisitForm(form, { mediaFiles });
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    try {
      setLoading(true);
      const payload = buildCreateVisitPayload(form);
      const visit = await createVisit(payload);
      const visitId = visit?.id;

      if (visitId && mediaFiles.length > 0) {
        const uploadErrors = [];
        for (const item of mediaFiles) {
          try {
            await uploadVisitAttachment(visitId, item.file);
          } catch {
            uploadErrors.push(item.file.name);
          }
        }
        if (uploadErrors.length > 0) {
          setSubmitError(
            `Visit created, but some files failed to upload: ${uploadErrors.join(", ")}`
          );
          navigate("/visits", { state: { refreshVisits: Date.now() } });
          return;
        }
      }

      navigate("/visits", { state: { refreshVisits: Date.now() } });
    } catch (err) {
      const data = err?.response?.data;
      if (data && typeof data === "object" && !data.detail) {
        const fieldErrors = data.errors || data;
        if (typeof fieldErrors === "object") {
          const mapped = {};
          Object.entries(fieldErrors).forEach(([k, v]) => {
            mapped[k] = Array.isArray(v) ? v[0] : String(v);
          });
          setErrors(mapped);
          return;
        }
      }
      setSubmitError(
        err?.message ||
          (typeof data?.detail === "string" ? data.detail : null) ||
          "Failed to create visit. Please check required fields and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const cropOptions = crops.map((c) => ({
    ...c,
    name_en: c.name_en || c.name || `Crop #${c.id}`,
  }));

  return (
    <div className="page-container page-container--form max-w-5xl">
      <PageHeader
        title="Add Visit"
        subtitle="Record a field visit with farmer, crop, problem, and media"
        actions={
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary btn-md">
            <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Back
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="create-visit-form" noValidate>
        <SectionCard title="Farmer Information" subtitle="Select existing or enter new farmer details">
          <ModeToggle value={form.farmer_mode} onChange={setFarmerMode} />

          {isExistingFarmer && (
            <div className="create-visit-field">
              <label className="form-label" htmlFor="create-visit-farmer">
                Farmer <span className="form-required" aria-hidden="true">*</span>
              </label>
              <CustomDropdown
                id="create-visit-farmer"
                options={farmerOptions}
                value={form.farmer_id}
                onChange={selectExistingFarmer}
                labelKey="name"
                placeholder={farmersLoading ? "Loading farmers…" : "Select farmer"}
                disabled={farmersLoading || farmerOptions.length === 0}
              />
              {errors.farmer_id ? <p className="form-error">{errors.farmer_id}</p> : null}
              {!farmersLoading && farmerOptions.length === 0 ? (
                <p className="form-hint form-hint--warn">
                  No farmers found. Switch to <strong>New farmer</strong> to enter details.
                </p>
              ) : null}
            </div>
          )}

          <div className="create-visit-grid">
            <Field
              label="Farmer Name"
              name="farmer_name"
              value={form.farmer_name}
              onChange={handleChange}
              required
              error={errors.farmer_name}
              placeholder="Full name"
            />
            <Field
              label="Phone Number"
              name="farmer_phone"
              value={form.farmer_phone}
              onChange={handleChange}
              required
              error={errors.farmer_phone}
              placeholder="10-digit mobile"
            />
          </div>

          <div className="create-visit-field mt-4">
            <p className="form-label">
              Location
              <span className="form-required" aria-hidden="true"> *</span>
            </p>
            <LocationSelector
              value={{
                district: form.district,
                taluk: form.taluk,
                village: form.village,
              }}
              onChange={handleLocationChange}
              defaultDistrictName={locationDefaultDistrict}
            />
            {errors.village ? <p className="form-error">{errors.village}</p> : null}
          </div>
        </SectionCard>

        <SectionCard title="Crop Information" subtitle="Crop and land area">
          <div className="create-visit-grid">
            <div className="create-visit-field">
              <label className="form-label" htmlFor="create-visit-crop">
                Crop <span className="form-required" aria-hidden="true">*</span>
              </label>
              <CustomDropdown
                id="create-visit-crop"
                options={cropOptions}
                value={form.crop}
                onChange={(id) => {
                  setField("crop", id);
                  setField("problem_item_ids", []);
                }}
                labelKey="name_en"
                subLabelKey="name_ta"
                placeholder={cropLoading ? "Loading crops…" : "Select crop"}
                disabled={cropLoading || cropOptions.length === 0}
              />
              {errors.crop ? <p className="form-error">{errors.crop}</p> : null}
            </div>

            <Field
              label="Acreage"
              name="land_area"
              type="number"
              value={form.land_area}
              onChange={handleChange}
              required
              error={errors.land_area}
              placeholder="e.g. 2.5"
            />
          </div>
        </SectionCard>

        <SectionCard title="Problems identified" subtitle="Crop-aware multi-select from problem masters">
          <div className="create-visit-field">
            <label className="form-label" htmlFor="create-visit-problems">
              Problems identified
              <span className="form-required" aria-hidden="true"> *</span>
            </label>
            <ProblemMultiSelect
              id="create-visit-problems"
              cropId={form.crop}
              value={form.problem_item_ids}
              onChange={(ids) => setField("problem_item_ids", ids)}
              error={errors.problem_item_ids}
            />
          </div>

          <Field
            label="Field observation / description"
            name="problem_description"
            type="textarea"
            value={form.problem_description}
            onChange={handleChange}
            required
            error={errors.problem_description}
            placeholder="Describe symptoms, severity, and field observations"
          />
        </SectionCard>

        <SectionCard title="Media Upload" subtitle="Photos and documents for this visit">
          <VisitMediaUploadField
            files={mediaFiles}
            onChange={(next) => {
              setMediaFiles(next);
              setErrors((prev) => ({ ...prev, media: undefined }));
            }}
            error={errors.media}
          />
        </SectionCard>

        {submitError ? (
          <ErrorRetry compact message={submitError} className="create-visit-submit-error" />
        ) : null}

        <div className="create-visit-footer">
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary btn-md" disabled={loading}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary btn-md" aria-busy={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Creating…
              </>
            ) : (
              "Create Visit"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
