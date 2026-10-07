import { PageHeader } from "../../components/ui/command";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { createCrop, updateCrop, deleteCrop } from "../../api/master.api";
import { getCropPestDiseaseList } from "../../api/cropPestDisease.api";
import { logApiDiagnostics } from "../../utils/apiDiagnostics";
import {
  normalizeCropPestDiseaseList,
  cropMatchesMappingSearch,
  cropProblemsPath,
} from "../../utils/cropPestDisease";
import {
  Wheat,
  Search,
  X,
  RefreshCw,
  Edit3,
  Trash2,
  Plus,
  AlertCircle,
  Loader2,
  Leaf,
  Bug,
  MoreVertical,
} from "lucide-react";
import SlidePanel from "../../components/ui/SlidePanel";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

const inputClass = "masters-admin-field";

function CropRowActions({ crop, onEdit, onDeleteRequest, layout = "table" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const cropName = crop?.name_en || `crop ${crop?.id ?? ""}`;
  const managePath = cropProblemsPath(crop.id);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  if (layout === "card") {
    return (
      <div className="cpd-crop-card__actions">
        <Link
          to={managePath}
          className="btn btn-primary btn-sm cpd-manage-btn"
          title="Manage Pest & Disease"
          aria-label={`Manage Pest and Disease for ${cropName}`}
        >
          <Bug className="w-3.5 h-3.5" aria-hidden="true" />
          Manage Pest &amp; Disease
        </Link>
        <button
          type="button"
          onClick={() => onEdit(crop)}
          className="btn btn-secondary btn-sm"
          title="Edit Crop"
          aria-label={`Edit Crop ${cropName}`}
        >
          <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
          Edit Crop
        </button>
        <div className="cpd-more-menu" ref={menuRef}>
          <button
            type="button"
            className="btn btn-ghost btn-sm cpd-more-trigger"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`More actions for ${cropName}`}
            title="More actions"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreVertical className="w-4 h-4" aria-hidden="true" />
          </button>
          {menuOpen ? (
            <div className="cpd-more-menu__panel" role="menu" aria-label={`More actions for ${cropName}`}>
              <button
                type="button"
                role="menuitem"
                className="cpd-more-menu__item cpd-more-menu__item--danger"
                onClick={() => {
                  setMenuOpen(false);
                  onDeleteRequest(crop);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                Delete Crop
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="cpd-row-actions">
      <Link
        to={managePath}
        className="cpd-action-link"
        title="Manage Pest & Disease"
        aria-label={`Manage Pest and Disease for ${cropName}`}
      >
        <Bug className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="cpd-action-link__full">Manage Pest &amp; Disease</span>
        <span className="cpd-action-link__short" aria-hidden="true">Manage</span>
      </Link>
      <button
        type="button"
        onClick={() => onEdit(crop)}
        className="cpd-action-btn"
        title="Edit Crop"
        aria-label={`Edit Crop ${cropName}`}
      >
        <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
        Edit
      </button>
      <div className="cpd-more-menu" ref={menuRef}>
        <button
          type="button"
          className="cpd-more-trigger"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`More actions for ${cropName}`}
          title="More actions"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreVertical className="w-4 h-4" aria-hidden="true" />
        </button>
        {menuOpen ? (
          <div className="cpd-more-menu__panel" role="menu" aria-label={`More actions for ${cropName}`}>
            <button
              type="button"
              role="menuitem"
              className="cpd-more-menu__item cpd-more-menu__item--danger"
              onClick={() => {
                setMenuOpen(false);
                onDeleteRequest(crop);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              Delete Crop
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CropForm({ initial = {}, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    name_en: initial.name_en || "",
    name_ta: initial.name_ta || "",
    scientific_name: initial.scientific_name || "",
    crop_category: initial.crop_category || "",
    typical_season: initial.typical_season || "",
    is_active: initial.is_active !== false,
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="masters-admin-form"
    >
      <div className={inputClass}>
        <label>Crop Name (English) *</label>
        <input
          type="text"
          required
          value={form.name_en}
          onChange={(e) => set("name_en", e.target.value)}
          placeholder="e.g. Paddy"
        />
      </div>
      <div className={inputClass}>
        <label>Crop Name (Tamil)</label>
        <input
          type="text"
          value={form.name_ta}
          onChange={(e) => set("name_ta", e.target.value)}
          placeholder="e.g. நெல்"
        />
      </div>
      <div className={inputClass}>
        <label>Scientific Name</label>
        <input
          type="text"
          value={form.scientific_name}
          onChange={(e) => set("scientific_name", e.target.value)}
          placeholder="e.g. Oryza sativa"
        />
      </div>
      <div className={inputClass}>
        <label>Category</label>
        <select value={form.crop_category} onChange={(e) => set("crop_category", e.target.value)}>
          <option value="">Select Category</option>
          {["cereal", "vegetable", "fruit", "pulse", "oilseed", "spice", "other"].map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div className={inputClass}>
        <label>Typical Season</label>
        <select value={form.typical_season} onChange={(e) => set("typical_season", e.target.value)}>
          <option value="">Select Season</option>
          {["kharif", "rabi", "zaid", "all_season"].map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>
      </div>
      <label className="masters-admin-check">
        <input
          type="checkbox"
          id="crop-active"
          checked={form.is_active}
          onChange={(e) => set("is_active", e.target.checked)}
        />
        Active
      </label>
      <div className="masters-admin-form__foot">
        <button type="submit" disabled={loading || !form.name_en.trim()} className="btn btn-primary btn-md">
          {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {initial.id ? "Update" : "Create"} Crop
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

function CountBadge({ value, kind }) {
  return (
    <span className={`cpd-count-badge cpd-count-badge--${kind}`} title={`${value} ${kind}`}>
      <span className="cpd-count-badge__value">{value}</span>
      <span className="sr-only">
        {kind === "pest" ? "pests" : "diseases"}
      </span>
    </span>
  );
}

export default function MasterCropsPage() {
  const [crops, setCrops] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const fetchCrops = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await getCropPestDiseaseList();
      const normalized = normalizeCropPestDiseaseList(payload);
      setCrops(normalized.results);
      setTotalCount(normalized.count);
    } catch (err) {
      // Never invent zero Pest/Disease counts — show error + Retry instead.
      const status = err?.response?.status;
      const detail =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        (status === 401
          ? "Authentication required to load crop Pest/Disease mappings."
          : status === 403
            ? "You do not have permission to view crop Pest/Disease mappings."
            : "Failed to load crop Pest/Disease mappings. Please retry.");
      setError(detail);
      setCrops([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCrops();
  }, [fetchCrops]);

  const handleSave = async (data) => {
    setSaveError(null);
    setSaving(true);
    try {
      if (editTarget?.id) await updateCrop(editTarget.id, data);
      else await createCrop(data);
      setFormOpen(false);
      setEditTarget(null);
      fetchCrops();
    } catch (err) {
      setSaveError(
        err?.response?.data?.detail ||
          Object.values(err?.response?.data || {}).flat().join(" ") ||
          "Save failed. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteCrop(deleteTarget.id);
      setDeleteTarget(null);
      fetchCrops();
    } catch (err) {
      setDeleteError(
        err?.response?.data?.detail ||
          Object.values(err?.response?.data || {}).flat().join(" ") ||
          "Delete failed. The crop may be in use."
      );
    } finally {
      setDeleting(false);
    }
  };

  const openCreate = () => {
    setEditTarget(null);
    setFormOpen(true);
  };
  const openEdit = (crop) => {
    setEditTarget(crop);
    setFormOpen(true);
  };

  const filtered = useMemo(
    () => crops.filter((c) => cropMatchesMappingSearch(c, search)),
    [crops, search]
  );

  useEffect(() => {
    logApiDiagnostics({
      label: "masters-crops-cpd-ui",
      url: "/api/v1/admin/crop-pest-disease/",
      apiCount: totalCount,
      rowsLoaded: crops.length,
      rowsRendered: filtered.length,
      pagination: { search: search.trim() || null },
    });
  }, [totalCount, crops.length, filtered.length, search]);

  return (
    <div className="masters-admin page-container">
      <PageHeader
        title="Master Crops"
        subtitle={
          <>
            Crop Pest &amp; Disease mappings for field operations
            {!loading && (
              <span className="ml-2 font-semibold text-teal-700">{totalCount} total</span>
            )}
          </>
        }
        badge={
          <span className="masters-admin-header__badge">
            <Wheat className="w-3 h-3" aria-hidden="true" />
            Crops
          </span>
        }
        actions={
          <>
            <button type="button" onClick={openCreate} className="btn btn-primary btn-md">
              <Plus className="w-4 h-4" aria-hidden="true" /> Add Crop
            </button>
            <button type="button" onClick={fetchCrops} className="btn btn-secondary btn-md">
              <RefreshCw className="w-4 h-4" aria-hidden="true" /> Refresh
            </button>
          </>
        }
      />

      <section className="masters-admin-filters" aria-label="Search crops">
        <div className="masters-admin-filters__row">
          <div className="masters-admin-search">
            <Search className="search-icon" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search crop name (English or Tamil)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
              aria-label="Search crops"
            />
          </div>
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="btn btn-ghost btn-md filter-toolbar__clear"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" /> Clear
            </button>
          )}
          <p className="masters-admin-filters__meta lg:ml-auto">{filtered.length} crops shown</p>
        </div>
      </section>

      {error && (
        <div className="masters-admin-alert masters-admin-alert--error" role="alert">
          <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
          <button type="button" onClick={fetchCrops} className="ml-auto font-semibold hover:underline">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="masters-admin-table-card cpd-skeleton-card" aria-busy="true" aria-label="Loading crops">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="cpd-skeleton-row">
              <div className="skeleton h-4 w-40 rounded" />
              <div className="skeleton h-6 w-10 rounded-full" />
              <div className="skeleton h-6 w-10 rounded-full" />
              <div className="skeleton h-4 w-16 rounded" />
              <div className="skeleton h-8 w-20 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="masters-admin-empty">
          <div className="masters-admin-empty__icon">
            <Wheat className="w-7 h-7" aria-hidden="true" />
          </div>
          <p className="text-base font-semibold text-slate-600">No crops found</p>
        </div>
      ) : (
        <>
          <div className="masters-admin-table-card cpd-crops-table-card">
            <div className="masters-admin-table-wrap">
              <table className="data-table compact-table masters-admin-table w-full">
                <thead>
                  <tr>
                    <th>Crop name</th>
                    <th className="text-center">Pests</th>
                    <th className="text-center">Diseases</th>
                    <th>Status</th>
                    <th className="cpd-actions-col text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="masters-admin-row-icon">
                            <Leaf className="w-3.5 h-3.5" aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <p className="masters-admin-row-name">{c.name_en || "\u2014"}</p>
                            {c.name_ta || c.tamil_name ? (
                              <p className="masters-admin-row-sub">{c.name_ta || c.tamil_name}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="text-center">
                        <CountBadge value={c.pest_count} kind="pest" />
                      </td>
                      <td className="text-center">
                        <CountBadge value={c.disease_count} kind="disease" />
                      </td>
                      <td>
                        <span
                          className={`masters-admin-status ${
                            c.is_active !== false
                              ? "masters-admin-status--active"
                              : "masters-admin-status--inactive"
                          }`}
                        >
                          <span className="masters-admin-status__dot" aria-hidden="true" />
                          {c.is_active !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="text-right">
                        <CropRowActions
                          crop={c}
                          onEdit={openEdit}
                          onDeleteRequest={setDeleteTarget}
                          layout="table"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="cpd-crops-cards" aria-label="Crop cards">
            {filtered.map((c) => (
              <article key={`card-${c.id}`} className="cpd-crop-card">
                <div className="cpd-crop-card__head">
                  <div className="min-w-0">
                    <p className="masters-admin-row-name">{c.name_en || "\u2014"}</p>
                    {c.name_ta || c.tamil_name ? (
                      <p className="masters-admin-row-sub">{c.name_ta || c.tamil_name}</p>
                    ) : null}
                  </div>
                  <span
                    className={`masters-admin-status ${
                      c.is_active !== false
                        ? "masters-admin-status--active"
                        : "masters-admin-status--inactive"
                    }`}
                  >
                    <span className="masters-admin-status__dot" aria-hidden="true" />
                    {c.is_active !== false ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="cpd-crop-card__counts">
                  <div>
                    <span className="cpd-crop-card__label">Pests</span>
                    <CountBadge value={c.pest_count} kind="pest" />
                  </div>
                  <div>
                    <span className="cpd-crop-card__label">Diseases</span>
                    <CountBadge value={c.disease_count} kind="disease" />
                  </div>
                </div>
                <CropRowActions
                  crop={c}
                  onEdit={openEdit}
                  onDeleteRequest={setDeleteTarget}
                  layout="card"
                />
              </article>
            ))}
          </div>
        </>
      )}

      <SlidePanel
        tone="masters"
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditTarget(null);
          setSaveError(null);
        }}
        title={editTarget ? "Edit Crop" : "Add Crop"}
      >
        {saveError && (
          <div className="masters-admin-alert masters-admin-alert--error mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>{saveError}</span>
          </div>
        )}
        <CropForm
          initial={editTarget || {}}
          onSubmit={handleSave}
          onCancel={() => {
            setFormOpen(false);
            setEditTarget(null);
            setSaveError(null);
          }}
          loading={saving}
        />
      </SlidePanel>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Crop"
        message={
          deleteError
            ? deleteError
            : `Delete crop "${deleteTarget?.name_en || "this crop"}"? This cannot be undone from this screen.`
        }
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}
