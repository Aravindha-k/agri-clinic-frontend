import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Bug,
  Check,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sprout,
  X,
} from "lucide-react";
import { PageHeader } from "../../components/ui/command";
import SlidePanel from "../../components/ui/SlidePanel";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/Toast";
import { fetchProblemCategories, updateProblemMaster } from "../../api/master.api";
import {
  createAdminProblemMaster,
  getCropPestDiseaseDetail,
  mapProblemMaster,
  searchAvailableMasters,
  unmapProblemMaster,
} from "../../api/cropPestDisease.api";
import {
  CPD_CATEGORY,
  CPD_CATEGORY_ID,
  cropDisplayName,
  displayTamilName,
  extractCreatedMasterId,
  filterMappedMasters,
  mapSuccessMessage,
  normalizeAvailableMasters,
  normalizeCropPestDiseaseDetail,
  resolveCategoryId,
  unmapConfirmCopy,
  unmapSuccessMessage,
} from "../../utils/cropPestDisease";

function StatusPill({ active }) {
  return (
    <span
      className={`masters-admin-status ${
        active !== false ? "masters-admin-status--active" : "masters-admin-status--inactive"
      }`}
    >
      <span className="masters-admin-status__dot" aria-hidden="true" />
      {active !== false ? "Active" : "Inactive"}
    </span>
  );
}

function MappedBadge() {
  return (
    <span className="cpd-mapped-badge">
      <Check className="w-3 h-3" aria-hidden="true" />
      Mapped
    </span>
  );
}

function MasterRow({ item, sectionLabel, onEdit, onUnmap, busyId }) {
  return (
    <li className="cpd-master-row">
      <div className="cpd-master-row__text min-w-0">
        <p className="cpd-master-row__name">{item.name || "\u2014"}</p>
        <p className="cpd-master-row__ta">{displayTamilName(item.tamil_name)}</p>
      </div>
      <div className="cpd-master-row__meta">
        <StatusPill active={item.is_active} />
        <MappedBadge />
        <button
          type="button"
          className="btn btn-secondary btn-sm cpd-edit-master-btn"
          onClick={() => onEdit(item)}
          disabled={busyId === item.id}
          aria-label={`Edit ${sectionLabel} ${item.name}`}
          title={`Edit ${sectionLabel} master`}
        >
          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
          Edit
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm cpd-unmap-btn"
          onClick={() => onUnmap(item)}
          disabled={busyId === item.id}
          aria-label={`Remove mapping for ${item.name}`}
          title="Remove mapping from this crop only"
        >
          {busyId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Remove mapping"}
        </button>
      </div>
    </li>
  );
}

export default function MasterCropPestDiseasePage() {
  const { cropId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(CPD_CATEGORY.PEST);
  const [mappedSearch, setMappedSearch] = useState("");
  const [categories, setCategories] = useState([]);

  const [addOpen, setAddOpen] = useState(false);
  const [availableSearch, setAvailableSearch] = useState("");
  const [available, setAvailable] = useState([]);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [availableError, setAvailableError] = useState(null);
  const [mappingId, setMappingId] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createTamil, setCreateTamil] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const [unmapTarget, setUnmapTarget] = useState(null);
  const [unmapping, setUnmapping] = useState(false);

  const [editMaster, setEditMaster] = useState(null);
  const [editNameEn, setEditNameEn] = useState("");
  const [editTamil, setEditTamil] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  const numericCropId = Number(cropId);

  const loadDetail = useCallback(async () => {
    if (!Number.isInteger(numericCropId) || numericCropId <= 0) {
      setError("Invalid crop id.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const raw = await getCropPestDiseaseDetail(numericCropId);
      setDetail(normalizeCropPestDiseaseDetail(raw));
    } catch (err) {
      setDetail(null);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.detail ||
          "Failed to load crop Pest & Disease mappings."
      );
    } finally {
      setLoading(false);
    }
  }, [numericCropId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cats = await fetchProblemCategories();
        if (!cancelled) setCategories(Array.isArray(cats) ? cats : []);
      } catch {
        if (!cancelled) setCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cropName = cropDisplayName(detail?.crop);
  const mappedItems = tab === CPD_CATEGORY.PEST ? detail?.pests || [] : detail?.diseases || [];
  const filteredMapped = useMemo(
    () => filterMappedMasters(mappedItems, mappedSearch),
    [mappedItems, mappedSearch]
  );

  const runAvailableSearch = useCallback(
    async (query) => {
      if (!Number.isInteger(numericCropId) || numericCropId <= 0) return;
      setAvailableLoading(true);
      setAvailableError(null);
      try {
        const raw = await searchAvailableMasters(numericCropId, {
          category: tab,
          search: query,
          includeMapped: false,
        });
        const normalized = normalizeAvailableMasters(raw);
        setAvailable(normalized.results);
      } catch (err) {
        setAvailable([]);
        setAvailableError(
          err?.response?.data?.message ||
            err?.response?.data?.detail ||
            "Failed to search available masters."
        );
      } finally {
        setAvailableLoading(false);
      }
    },
    [numericCropId, tab]
  );

  useEffect(() => {
    if (!addOpen) return undefined;
    const handle = window.setTimeout(() => {
      runAvailableSearch(availableSearch.trim());
    }, 280);
    return () => window.clearTimeout(handle);
  }, [addOpen, availableSearch, runAvailableSearch]);

  const openAdd = () => {
    setAvailableSearch("");
    setAvailable([]);
    setAvailableError(null);
    setCreateOpen(false);
    setCreateError(null);
    setAddOpen(true);
  };

  const handleMap = async (master) => {
    if (!master?.id) return;
    setMappingId(master.id);
    try {
      await mapProblemMaster(numericCropId, master.id);
      toast(mapSuccessMessage({ masterName: master.name, cropName }), "success");
      await loadDetail();
      await runAvailableSearch(availableSearch.trim());
    } catch (err) {
      toast(
        err?.response?.data?.message ||
          err?.response?.data?.detail ||
          Object.values(err?.response?.data?.errors || {}).flat().join(" ") ||
          "Map failed",
        "error"
      );
    } finally {
      setMappingId(null);
    }
  };

  const handleUnmap = async () => {
    if (!unmapTarget?.id) return;
    setUnmapping(true);
    try {
      await unmapProblemMaster(numericCropId, unmapTarget.id);
      toast(
        unmapSuccessMessage({ masterName: unmapTarget.name, cropName }),
        "success"
      );
      setUnmapTarget(null);
      await loadDetail();
    } catch (err) {
      toast(
        err?.response?.data?.message ||
          err?.response?.data?.detail ||
          "Unmap failed",
        "error"
      );
    } finally {
      setUnmapping(false);
    }
  };

  const openEditMaster = (item) => {
    if (!item?.id) return;
    const nameEn =
      String(item.name_en ?? item.name ?? "").trim() || String(item.name ?? "").trim();
    setEditMaster(item);
    setEditNameEn(nameEn);
    setEditTamil(String(item.tamil_name ?? item.name_ta ?? "").trim());
    setEditActive(item.is_active !== false);
    setEditError(null);
  };

  const closeEditMaster = () => {
    if (editSaving) return;
    setEditMaster(null);
    setEditError(null);
  };

  const handleEditMasterSave = async (e) => {
    e.preventDefault();
    if (!editMaster?.id) return;
    const nameEn = editNameEn.trim();
    if (!nameEn) {
      setEditError("English name is required.");
      return;
    }
    const nameTa = editTamil.trim();
    const payload = {
      name: nameEn,
      name_en: nameEn,
      name_ta: nameTa || undefined,
      tamil_name: nameTa || "",
      is_active: editActive,
    };
    setEditSaving(true);
    setEditError(null);
    try {
      await updateProblemMaster(editMaster.id, payload);
      toast(`${sectionLabel} updated`, "success");
      setEditMaster(null);
      await loadDetail();
    } catch (err) {
      setEditError(
        err?.response?.data?.message ||
          err?.response?.data?.detail ||
          Object.values(err?.response?.data?.errors || {}).flat().join(" ") ||
          "Update failed"
      );
    } finally {
      setEditSaving(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const name = createName.trim();
    if (!name) {
      setCreateError("English name is required.");
      return;
    }
    const categoryId = resolveCategoryId(
      categories,
      tab,
      tab === CPD_CATEGORY.PEST ? CPD_CATEGORY_ID.PEST : CPD_CATEGORY_ID.DISEASE
    );
    if (categoryId == null) {
      setCreateError("Could not resolve Pest/Disease category id.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createAdminProblemMaster({
        category: categoryId,
        name,
        name_en: name,
        tamil_name: createTamil.trim() || "",
        name_ta: createTamil.trim() || undefined,
        is_active: true,
      });
      const newId = extractCreatedMasterId(created);
      if (newId == null) {
        throw new Error("Create succeeded but no ProblemMaster id was returned.");
      }
      await mapProblemMaster(numericCropId, newId);
      toast(
        mapSuccessMessage({ masterName: name, cropName }),
        "success"
      );
      setCreateName("");
      setCreateTamil("");
      setCreateOpen(false);
      setAddOpen(false);
      await loadDetail();
    } catch (err) {
      setCreateError(
        err?.response?.data?.message ||
          err?.response?.data?.detail ||
          err?.message ||
          "Create failed"
      );
    } finally {
      setCreating(false);
    }
  };

  const unmapCopy = unmapConfirmCopy({
    masterName: unmapTarget?.name,
    cropName,
  });

  const sectionLabel = tab === CPD_CATEGORY.PEST ? "Pest" : "Disease";

  return (
    <div className="masters-admin page-container cpd-detail-page">
      <PageHeader
        title={loading ? "Crop / Pest / Disease" : cropName}
        subtitle={
          loading
            ? "Loading mappings…"
            : detail?.crop?.name_ta || detail?.crop?.tamil_name || "Manage Pest & Disease mappings"
        }
        badge={
          <span className="masters-admin-header__badge">
            <Bug className="w-3 h-3" aria-hidden="true" />
            Crop Health
          </span>
        }
        actions={
          <>
            <Link to="/masters/crops" className="btn btn-secondary btn-md">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to Crop / Pest / Disease
              Master
            </Link>
            <button type="button" onClick={loadDetail} className="btn btn-secondary btn-md" disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh
            </button>
          </>
        }
      />

      {error && (
        <div className="masters-admin-alert masters-admin-alert--error" role="alert">
          <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
          <button type="button" onClick={loadDetail} className="ml-auto font-semibold hover:underline">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="cpd-detail-skeleton" aria-busy="true" aria-label="Loading crop mappings">
          <div className="skeleton h-8 w-56 rounded mb-3" />
          <div className="skeleton h-4 w-40 rounded mb-6" />
          <div className="skeleton h-10 w-72 rounded mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-14 w-full rounded-xl mb-2" />
          ))}
        </div>
      ) : detail?.crop?.id ? (
        <>
          <section className="cpd-detail-hero" aria-labelledby="cpd-crop-heading">
            <div className="cpd-detail-hero__icon" aria-hidden="true">
              <Sprout className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 id="cpd-crop-heading" className="cpd-detail-hero__title">
                {detail.crop.name_en || cropName}
              </h2>
              <p className="cpd-detail-hero__ta">
                {displayTamilName(detail.crop.tamil_name || detail.crop.name_ta)}
              </p>
              <div className="cpd-detail-hero__meta">
                <StatusPill active={detail.crop.is_active} />
                <span className="cpd-stat">
                  Pests <strong>{detail.pest_count}</strong>
                </span>
                <span className="cpd-stat">
                  Diseases <strong>{detail.disease_count}</strong>
                </span>
              </div>
            </div>
          </section>

          <div className="masters-admin-tabs cpd-tabs" role="tablist" aria-label="Pest or Disease">
            <button
              type="button"
              role="tab"
              id="cpd-tab-pest"
              aria-selected={tab === CPD_CATEGORY.PEST}
              aria-controls="cpd-panel-pest"
              className={`masters-admin-tab ${tab === CPD_CATEGORY.PEST ? "masters-admin-tab--active" : ""}`}
              onClick={() => {
                setTab(CPD_CATEGORY.PEST);
                setMappedSearch("");
              }}
            >
              Pests
              <span className="masters-admin-tab__count">{detail.pest_count}</span>
            </button>
            <button
              type="button"
              role="tab"
              id="cpd-tab-disease"
              aria-selected={tab === CPD_CATEGORY.DISEASE}
              aria-controls="cpd-panel-disease"
              className={`masters-admin-tab ${tab === CPD_CATEGORY.DISEASE ? "masters-admin-tab--active" : ""}`}
              onClick={() => {
                setTab(CPD_CATEGORY.DISEASE);
                setMappedSearch("");
              }}
            >
              Diseases
              <span className="masters-admin-tab__count">{detail.disease_count}</span>
            </button>
          </div>

          <section
            className="cpd-mapped-panel"
            role="tabpanel"
            id={`cpd-panel-${tab}`}
            aria-labelledby={`cpd-tab-${tab}`}
            aria-label={`Mapped ${sectionLabel}s`}
          >
            <div className="cpd-mapped-panel__toolbar">
              <div className="masters-admin-search cpd-mapped-search">
                <Search className="search-icon" aria-hidden="true" />
                <input
                  type="search"
                  className="search-input"
                  value={mappedSearch}
                  onChange={(e) => setMappedSearch(e.target.value)}
                  placeholder={`Search mapped ${sectionLabel.toLowerCase()}s…`}
                  aria-label={`Search mapped ${sectionLabel}s`}
                />
              </div>
              <button type="button" className="btn btn-primary btn-md" onClick={openAdd}>
                <Plus className="w-4 h-4" aria-hidden="true" />
                Add {sectionLabel}
              </button>
            </div>

            {filteredMapped.length === 0 ? (
              <div className="masters-admin-empty cpd-empty">
                <p className="text-base font-semibold text-slate-600">
                  {mappedSearch.trim()
                    ? `No matching ${sectionLabel.toLowerCase()} masters found.`
                    : tab === CPD_CATEGORY.PEST
                      ? "No pests mapped to this crop."
                      : "No diseases mapped to this crop."}
                </p>
              </div>
            ) : (
              <ul className="cpd-master-list">
                {filteredMapped.map((item) => (
                  <MasterRow
                    key={item.id}
                    item={item}
                    sectionLabel={sectionLabel}
                    onEdit={openEditMaster}
                    onUnmap={setUnmapTarget}
                    busyId={
                      (editSaving && editMaster?.id === item.id) ||
                      (unmapping && unmapTarget?.id === item.id)
                        ? item.id
                        : null
                    }
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      <SlidePanel
        tone="masters"
        open={addOpen}
        onClose={() => {
          if (creating || mappingId) return;
          setAddOpen(false);
          setCreateOpen(false);
        }}
        title={`Add ${sectionLabel}`}
      >
        <div className="cpd-add-panel">
          <p className="cpd-add-panel__hint">
            Search existing {sectionLabel.toLowerCase()} masters, or create a new one for this crop.
          </p>

          <div className="masters-admin-search">
            <Search className="search-icon" aria-hidden="true" />
            <input
              type="search"
              className="search-input"
              value={availableSearch}
              onChange={(e) => setAvailableSearch(e.target.value)}
              placeholder={`Search available ${sectionLabel.toLowerCase()} masters…`}
              aria-label={`Search available ${sectionLabel} masters`}
            />
            {availableSearch && (
              <button
                type="button"
                className="cpd-search-clear"
                onClick={() => setAvailableSearch("")}
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {availableError && (
            <div className="masters-admin-alert masters-admin-alert--error mt-3" role="alert">
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              <span>{availableError}</span>
            </div>
          )}

          <div className="cpd-available-block mt-4">
            <h3 className="cpd-available-block__title">Available masters</h3>
            {availableLoading ? (
              <div className="cpd-available-loading">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Searching…
              </div>
            ) : available.length === 0 ? (
              <p className="cpd-available-empty">
                {`No matching ${sectionLabel} masters found.`}
              </p>
            ) : (
              <ul className="cpd-available-list">
                {available.map((m) => (
                  <li key={m.id} className="cpd-available-row">
                    <div className="min-w-0">
                      <p className="cpd-master-row__name">{m.name}</p>
                      <p className="cpd-master-row__ta">{displayTamilName(m.tamil_name)}</p>
                      {m.already_mapped ? (
                        <span className="cpd-mapped-badge mt-1">
                          <Check className="w-3 h-3" aria-hidden="true" /> Mapped
                        </span>
                      ) : (
                        <span className="cpd-available-badge mt-1">Available</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={m.already_mapped || mappingId === m.id}
                      onClick={() => handleMap(m)}
                      aria-label={`Map ${m.name} to ${cropName}`}
                    >
                      {mappingId === m.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Map
                        </>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="cpd-create-divider">
            <button
              type="button"
              className="btn btn-secondary btn-md w-full"
              onClick={() => {
                setCreateOpen((v) => !v);
                setCreateError(null);
              }}
            >
              {createOpen ? "Hide create form" : `Create new ${sectionLabel}`}
            </button>
          </div>

          {createOpen && (
            <form className="masters-admin-form mt-3" onSubmit={handleCreate}>
              <div className="masters-admin-field">
                <label htmlFor="cpd-create-en">English Name *</label>
                <input
                  id="cpd-create-en"
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder={`e.g. ${tab === CPD_CATEGORY.PEST ? "Leaf Miner" : "Leaf Spot"}`}
                />
              </div>
              <div className="masters-admin-field">
                <label htmlFor="cpd-create-ta">Tamil Name (optional)</label>
                <input
                  id="cpd-create-ta"
                  type="text"
                  value={createTamil}
                  onChange={(e) => setCreateTamil(e.target.value)}
                  placeholder="Leave blank if not available"
                />
              </div>
              <p className="cpd-create-fixed-cat">
                This will be saved as a <strong>{sectionLabel}</strong> and mapped to {cropName}.
              </p>
              {createError && (
                <div className="masters-admin-alert masters-admin-alert--error">
                  <AlertCircle className="w-4 h-4" aria-hidden="true" />
                  <span>{createError}</span>
                </div>
              )}
              <div className="masters-admin-form__foot">
                <button type="submit" className="btn btn-primary btn-md" disabled={creating}>
                  {creating && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                  Create &amp; map to {cropName}
                </button>
              </div>
            </form>
          )}
        </div>
      </SlidePanel>

      <SlidePanel
        tone="masters"
        open={!!editMaster}
        onClose={closeEditMaster}
        title={editMaster ? `Edit ${sectionLabel}` : "Edit master"}
      >
        {editMaster ? (
          <form className="masters-admin-form" onSubmit={handleEditMasterSave}>
            <div className="masters-admin-alert masters-admin-alert--info mb-3" role="status">
              <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>
                Changes to this master will appear for every crop where it is used.
              </span>
            </div>
            <div className="masters-admin-field">
              <label htmlFor="cpd-edit-en">
                English Name <span className="text-red-500">*</span>
              </label>
              <input
                id="cpd-edit-en"
                type="text"
                required
                value={editNameEn}
                onChange={(e) => setEditNameEn(e.target.value)}
              />
            </div>
            <div className="masters-admin-field">
              <label htmlFor="cpd-edit-ta">Tamil Name</label>
              <input
                id="cpd-edit-ta"
                type="text"
                value={editTamil}
                onChange={(e) => setEditTamil(e.target.value)}
                placeholder="Leave blank if not available"
              />
            </div>
            <label className="masters-admin-check">
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
              />
              Active
            </label>
            {editError && (
              <div className="masters-admin-alert masters-admin-alert--error mt-3">
                <AlertCircle className="w-4 h-4" aria-hidden="true" />
                <span>{editError}</span>
              </div>
            )}
            <div className="masters-admin-form__foot">
              <button type="button" className="btn btn-secondary btn-md" onClick={closeEditMaster} disabled={editSaving}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-md" disabled={editSaving}>
                {editSaving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                Save master
              </button>
            </div>
          </form>
        ) : null}
      </SlidePanel>

      <ConfirmDialog
        open={!!unmapTarget}
        title={unmapCopy.title}
        message={`${unmapCopy.message} ${unmapCopy.support}`}
        onConfirm={handleUnmap}
        onCancel={() => !unmapping && setUnmapTarget(null)}
        loading={unmapping}
        variant="danger"
        confirmLabel="Remove mapping"
      />

      {!loading && !detail?.crop?.id && !error ? (
        <div className="masters-admin-empty">
          <p className="text-base font-semibold text-slate-600">Crop not found</p>
          <button type="button" className="btn btn-secondary btn-md mt-3" onClick={() => navigate("/masters/crops")}>
            Back to Crop / Pest / Disease Master
          </button>
        </div>
      ) : null}
    </div>
  );
}
