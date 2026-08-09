import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import CustomDropdown from "../components/CustomDropdown";
import VisitMediaUploadField from "../components/visits/VisitMediaUploadField";
import { PageHeader, ErrorRetry } from "../components/ui/command";
import { fetchAllCrops } from "../api/crop.api";
import { fetchAllVillages, fetchProblemCategories, fetchAllProblemMasters } from "../api/master.api";
import { fetchAllFarmers } from "../api/farmer.api";
import { createVisit, uploadVisitAttachment } from "../api/visit.api";
import {
  farmerRecordToVisitForm,
  farmersToDropdownOptions,
} from "../utils/farmerFormMapping";
import {
  PROBLEM_TYPE_PILLS,
  PROBLEM_TYPE_CODES,
  validateCreateVisitForm,
  buildCreateVisitPayload,
  findCategoryForCode,
  categoryRequiresMaster,
} from "../utils/createVisitForm";
import { ChevronLeft, Loader2 } from "lucide-react";

const EMPTY_FORM = {
  farmer_mode: "new",
  farmer_id: null,
  farmer_name: "",
  farmer_phone: "",
  village: null,
  crop: null,
  land_area: "",
  problem_type_code: "",
  problem_category: null,
  problem_master: null,
  problem_other: "",
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

  const [villages, setVillages] = useState([]);
  const [crops, setCrops] = useState([]);
  const [categories, setCategories] = useState([]);
  const [problemMasters, setProblemMasters] = useState([]);
  const [mastersLoading, setMastersLoading] = useState(false);
  const [mastersApiMissing, setMastersApiMissing] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);

  const [farmers, setFarmers] = useState([]);
  const [farmerOptions, setFarmerOptions] = useState([]);
  const [farmersLoading, setFarmersLoading] = useState(true);
  const [villageLoading, setVillageLoading] = useState(true);
  const [cropLoading, setCropLoading] = useState(true);

  const isExistingFarmer = form.farmer_mode === "existing";
  const isOthers = form.problem_type_code === PROBLEM_TYPE_CODES.OTHERS;

  const selectedCategory = useMemo(
    () => findCategoryForCode(categories, form.problem_type_code),
    [categories, form.problem_type_code]
  );

  const needsMasterDropdown = useMemo(() => {
    if (!form.problem_type_code || isOthers) return false;
    return categoryRequiresMaster(selectedCategory, form.problem_type_code);
  }, [selectedCategory, form.problem_type_code, isOthers]);

  useEffect(() => {
    setVillageLoading(true);
    fetchAllVillages()
      .then((page) => setVillages(page.results || []))
      .catch(() => setVillages([]))
      .finally(() => setVillageLoading(false));

    setCropLoading(true);
    fetchAllCrops()
      .then((page) => setCrops(page.results || []))
      .catch(() => setCrops([]))
      .finally(() => setCropLoading(false));

    fetchProblemCategories()
      .then(setCategories)
      .catch(() => setCategories([]));

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
    if (!preselectFarmerId || !farmers.length || !villages.length) return;
    const farmer = farmers.find((f) => f.id === preselectFarmerId);
    if (!farmer) return;
    const mapped = farmerRecordToVisitForm(farmer, villages);
    if (!mapped) return;
    setForm((prev) => ({
      ...prev,
      farmer_mode: "existing",
      ...mapped,
    }));
  }, [preselectFarmerId, farmers, villages]);

  const loadProblemMasters = useCallback(async () => {
    if (!form.problem_type_code || !selectedCategory?.id) {
      setProblemMasters([]);
      return;
    }
    setMastersLoading(true);
    try {
      const { items, apiAvailable } = await fetchAllProblemMasters({
        category_id: selectedCategory.id,
        problem_category: selectedCategory.id,
        crop_id: form.crop || undefined,
      });
      setMastersApiMissing(apiAvailable === false);
      setProblemMasters(items || []);
    } catch {
      setProblemMasters([]);
      setMastersApiMissing(true);
    } finally {
      setMastersLoading(false);
    }
  }, [form.problem_type_code, selectedCategory?.id, form.crop]);

  useEffect(() => {
    loadProblemMasters();
  }, [loadProblemMasters]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setField(name, value);
  };

  const setFarmerMode = (mode) => {
    setForm({ ...EMPTY_FORM, farmer_mode: mode });
    setErrors({});
  };

  const selectExistingFarmer = (farmerId) => {
    const farmer = farmers.find((f) => f.id === farmerId);
    const mapped = farmerRecordToVisitForm(farmer, villages);
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

  const selectProblemType = (code) => {
    const cat = findCategoryForCode(categories, code);
    setForm((prev) => ({
      ...prev,
      problem_type_code: code,
      problem_category: cat?.id ?? null,
      problem_master: null,
      problem_other: code === PROBLEM_TYPE_CODES.OTHERS ? prev.problem_other : "",
    }));
    setErrors((prev) => ({
      ...prev,
      problem_type_code: undefined,
      problem_category: undefined,
      problem_master: undefined,
      problem_other: undefined,
    }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setSubmitError("");

    const requiresMaster = needsMasterDropdown && problemMasters.length > 0;

    const validation = validateCreateVisitForm(form, {
      requiresMaster,
      mediaFiles,
    });
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    try {
      setLoading(true);
      const payload = buildCreateVisitPayload(form, categories);
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

  const masterLabel =
    form.problem_type_code === PROBLEM_TYPE_CODES.PEST
      ? "Pest"
      : form.problem_type_code === PROBLEM_TYPE_CODES.DISEASE
        ? "Disease"
        : form.problem_type_code === PROBLEM_TYPE_CODES.NUTRIENT
          ? "Nutrient deficiency"
          : "Other problem";

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
            <div className="create-visit-field">
              <label className="form-label" htmlFor="create-visit-village">
                Village <span className="form-required" aria-hidden="true">*</span>
              </label>
              <CustomDropdown
                id="create-visit-village"
                options={villages}
                value={form.village}
                onChange={(id) => setField("village", id)}
                labelKey="name"
                placeholder={villageLoading ? "Loading villages…" : "Select village"}
                disabled={villageLoading || villages.length === 0}
              />
              {errors.village ? <p className="form-error">{errors.village}</p> : null}
            </div>
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
                  setField("problem_master", null);
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

        <SectionCard title="Problem Information" subtitle="Type, sub-category, and description">
          <div className="create-visit-field">
            <span className="form-label">
              Problem Type <span className="form-required" aria-hidden="true">*</span>
            </span>
            <div className="create-visit-pills" role="group" aria-label="Problem type">
              {PROBLEM_TYPE_PILLS.map((pill) => {
                const active = form.problem_type_code === pill.code;
                const cat = findCategoryForCode(categories, pill.code);
                const disabled = categories.length > 0 && !cat;
                return (
                  <button
                    key={pill.code}
                    type="button"
                    disabled={disabled}
                    onClick={() => selectProblemType(pill.code)}
                    className={`create-visit-pill${active ? " create-visit-pill--active" : ""}`}
                    aria-pressed={active}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
            {errors.problem_type_code ? (
              <p className="form-error">{errors.problem_type_code}</p>
            ) : null}
            {errors.problem_category ? (
              <p className="form-error">{errors.problem_category}</p>
            ) : null}
          </div>

          {form.problem_type_code && needsMasterDropdown ? (
            <div className="create-visit-field">
              <label className="form-label" htmlFor="create-visit-master">
                {masterLabel}
                <span className="form-required" aria-hidden="true"> *</span>
              </label>
              {mastersApiMissing ? (
                <p className="form-hint form-hint--warn">
                  Problem list API is not available yet. Add items under{" "}
                  <button
                    type="button"
                    className="form-hint__link"
                    onClick={() => navigate("/masters/problem-items")}
                  >
                    Masters → Problem items
                  </button>{" "}
                  when enabled, or choose <strong>Others</strong> and describe below.
                </p>
              ) : (
                <CustomDropdown
                  id="create-visit-master"
                  options={problemMasters}
                  value={form.problem_master}
                  onChange={(id) => setField("problem_master", id)}
                  labelKey="name"
                  placeholder={
                    mastersLoading
                      ? "Loading options…"
                      : problemMasters.length
                        ? `Select ${masterLabel.toLowerCase()}`
                        : "No items — add under Masters"
                  }
                  disabled={mastersLoading || problemMasters.length === 0}
                />
              )}
              {errors.problem_master ? (
                <p className="form-error">{errors.problem_master}</p>
              ) : null}
            </div>
          ) : null}

          {isOthers ? (
            <Field
              label="Other problem"
              name="problem_other"
              value={form.problem_other}
              onChange={handleChange}
              required
              error={errors.problem_other}
              placeholder="Describe the problem type"
            />
          ) : null}

          <Field
            label="Problem Description"
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
