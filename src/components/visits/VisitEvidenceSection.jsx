import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Paperclip,
  Image as ImageIcon,
  FileText,
  File,
  Mic,
  StickyNote,
  Download,
  ExternalLink,
  RefreshCw,
  X,
  User,
  Clock,
  HardDrive,
} from "lucide-react";
import { getVisitAttachments } from "../../api/visit.api";
import { EmptyState } from "../ui/command";
import ErrorRetry from "../ui/ErrorRetry";
import { ATTACHMENT_KIND } from "../../utils/visitAttachments";

const KIND_META = {
  [ATTACHMENT_KIND.IMAGE]: { label: "Photo", icon: ImageIcon, tone: "emerald" },
  [ATTACHMENT_KIND.PDF]: { label: "PDF", icon: FileText, tone: "red" },
  [ATTACHMENT_KIND.DOCUMENT]: { label: "Document", icon: File, tone: "blue" },
  [ATTACHMENT_KIND.AUDIO]: { label: "Voice note", icon: Mic, tone: "violet" },
  [ATTACHMENT_KIND.TEXT]: { label: "Text note", icon: StickyNote, tone: "amber" },
  [ATTACHMENT_KIND.OTHER]: { label: "File", icon: Paperclip, tone: "slate" },
};

function toneClasses(tone) {
  const map = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    red: "bg-red-50 text-red-700 border-red-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
    amber: "bg-amber-50 text-amber-800 border-amber-100",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return map[tone] || map.slate;
}

function ImagePreviewModal({ item, onClose }) {
  if (!item) return null;
  const src = item.url || item.thumbnailUrl;
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-10 right-0 p-2 text-white/90 hover:text-white"
          aria-label="Close preview"
        >
          <X className="w-6 h-6" />
        </button>
        {src ? (
          <img
            src={src}
            alt={item.filename}
            className="max-h-[80vh] w-auto max-w-full mx-auto rounded-xl shadow-2xl object-contain bg-black/20"
          />
        ) : (
          <div className="rounded-xl bg-white p-8 text-center text-slate-500">
            Preview unavailable for this file.
          </div>
        )}
        <p className="mt-3 text-center text-sm text-white/90 truncate">{item.filename}</p>
      </div>
    </div>
  );
}

function AttachmentThumb({ item, broken, onBroken }) {
  const src = item.thumbnailUrl || item.url;
  if (item.kind !== ATTACHMENT_KIND.IMAGE || !src || broken) {
    const meta = KIND_META[item.kind] || KIND_META[ATTACHMENT_KIND.OTHER];
    const Icon = meta.icon;
    return (
      <div
        className={`visits-evidence-card__thumb flex items-center justify-center ${toneClasses(meta.tone)}`}
      >
        <Icon className="w-10 h-10 opacity-80" strokeWidth={1.5} aria-hidden="true" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      className="visits-evidence-card__thumb object-cover"
      onError={onBroken}
    />
  );
}

function ReportPhotoTile({ item, onPreview }) {
  const [broken, setBroken] = useState(false);
  const src = item.thumbnailUrl || item.url;

  return (
    <button
      type="button"
      className="visit-report-photo"
      onClick={() => onPreview(item)}
      disabled={!src}
      aria-label={`Preview ${item.filename}`}
    >
      {src && !broken ? (
        <img src={src} alt={item.filename} onError={() => setBroken(true)} />
      ) : (
        <div className="visit-report-photo__placeholder">
          <ImageIcon className="w-8 h-8" aria-hidden="true" />
        </div>
      )}
      <span className="visit-report-photo__caption">{item.filename}</span>
    </button>
  );
}

function EvidenceCardSkeleton() {
  return (
    <div className="visits-evidence-card" aria-hidden="true">
      <div className="skeleton visits-evidence-card__thumb rounded-xl" />
      <div className="skeleton h-4 w-3/4 rounded" />
      <div className="space-y-2">
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-2/3 rounded" />
      </div>
    </div>
  );
}

function EvidenceCard({ item, onPreviewImage }) {
  const [imgBroken, setImgBroken] = useState(false);
  const meta = KIND_META[item.kind] || KIND_META[ATTACHMENT_KIND.OTHER];
  const Icon = meta.icon;
  const canOpen = item.url && item.kind !== ATTACHMENT_KIND.TEXT;

  return (
    <article className="visits-evidence-card">
      {item.kind === ATTACHMENT_KIND.IMAGE ? (
        <button
          type="button"
          className="block w-full text-left rounded-xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          onClick={() => onPreviewImage(item)}
          disabled={!item.url && !item.thumbnailUrl}
        >
          <AttachmentThumb item={item} broken={imgBroken} onBroken={() => setImgBroken(true)} />
        </button>
      ) : item.kind === ATTACHMENT_KIND.TEXT ? (
        <div className={`visits-evidence-card__thumb flex items-start p-3 min-h-[8rem] ${toneClasses(meta.tone)}`}>
          <p className="text-sm text-slate-800 whitespace-pre-wrap break-words line-clamp-6">
            {item.textContent || item.description || "—"}
          </p>
        </div>
      ) : (
        <AttachmentThumb item={item} broken={false} onBroken={() => {}} />
      )}

      <div className="flex items-start gap-2 min-w-0">
        <div
          className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${toneClasses(meta.tone)}`}
        >
          <Icon className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 truncate" title={item.filename}>
            {item.filename}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">{meta.label}</p>
        </div>
      </div>

      <dl className="visits-evidence-card__meta">
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-slate-300 shrink-0" aria-hidden="true" />
          <dd className="truncate">{item.uploadedBy}</dd>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-slate-300 shrink-0" aria-hidden="true" />
          <dd>{item.uploadedAtLabel}</dd>
        </div>
        <div className="flex items-center gap-2">
          <HardDrive className="w-3.5 h-3.5 text-slate-300 shrink-0" aria-hidden="true" />
          <dd>{item.fileSizeLabel}</dd>
        </div>
      </dl>

      {item.kind === ATTACHMENT_KIND.AUDIO && item.url && (
        <audio controls preload="metadata" className="w-full h-9" src={item.url}>
          Your browser does not support audio playback.
        </audio>
      )}

      {item.kind === ATTACHMENT_KIND.TEXT && item.textContent && item.description && (
        <p className="text-xs text-slate-500 border-t border-slate-50 pt-2 line-clamp-2">
          {item.description}
        </p>
      )}

      <div className="visits-evidence-card__actions">
        {item.kind === ATTACHMENT_KIND.IMAGE && (item.url || item.thumbnailUrl) && (
          <button
            type="button"
            onClick={() => onPreviewImage(item)}
            className="btn btn-ghost btn-sm text-emerald-700"
          >
            Preview
          </button>
        )}
        {canOpen && (
          <>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm text-emerald-700 inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              Open
            </a>
            <a
              href={item.url}
              download={item.filename}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm text-slate-600 inline-flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Download
            </a>
          </>
        )}
        {item.kind === ATTACHMENT_KIND.TEXT && !item.url && (
          <span className="text-[11px] text-slate-400">View only</span>
        )}
        {!item.url && item.kind !== ATTACHMENT_KIND.TEXT && (
          <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
            File link unavailable
          </span>
        )}
      </div>
    </article>
  );
}

function ReportEvidenceContent({ items, loading, error, onLoad, onPreview }) {
  const { photos, attachments } = useMemo(() => {
    const imageItems = items.filter((item) => item.kind === ATTACHMENT_KIND.IMAGE);
    const otherItems = items.filter((item) => item.kind !== ATTACHMENT_KIND.IMAGE);
    return { photos: imageItems, attachments: otherItems };
  }, [items]);

  if (loading) {
    return (
      <>
        <div className="visit-report-photo-gallery" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton visit-report-photo rounded-xl" />
          ))}
        </div>
        <div className="visits-evidence__grid mt-5">
          {Array.from({ length: 2 }).map((_, i) => (
            <EvidenceCardSkeleton key={i} />
          ))}
        </div>
      </>
    );
  }

  if (error) {
    return <ErrorRetry compact message={error} onRetry={onLoad} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Paperclip}
        title="No evidence uploaded"
        subtitle="Field agents can attach photos, documents, voice notes, and text from the mobile app."
      />
    );
  }

  return (
    <>
      {photos.length > 0 && (
        <div>
          <p className="visit-report-attachments__title">Photographic evidence</p>
          <div className="visit-report-photo-gallery">
            {photos.map((item) => (
              <ReportPhotoTile key={item.id} item={item} onPreview={onPreview} />
            ))}
          </div>
        </div>
      )}

      {attachments.length > 0 && (
        <div>
          <p className="visit-report-attachments__title">Supporting attachments</p>
          <div className="visits-evidence__grid">
            {attachments.map((item) => (
              <EvidenceCard key={item.id} item={item} onPreviewImage={onPreview} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default function VisitEvidenceSection({ visitId, onCountChange, variant = "default" }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  const load = useCallback(async () => {
    if (!visitId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await getVisitAttachments(visitId);
      setItems(list);
      onCountChange?.(list.length);
    } catch (err) {
      setError(err?.message || "Failed to load visit evidence");
      setItems([]);
      onCountChange?.(0);
    } finally {
      setLoading(false);
    }
  }, [visitId, onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  if (variant === "report") {
    return (
      <>
        <ReportEvidenceContent
          items={items}
          loading={loading}
          error={error}
          onLoad={load}
          onPreview={setPreview}
        />
        <ImagePreviewModal item={preview} onClose={() => setPreview(null)} />
      </>
    );
  }

  return (
    <section className="visits-evidence" aria-labelledby="visit-evidence-heading">
      <div className="visits-detail-card__header justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="list-meta-icon list-meta-icon--crop">
            <Paperclip className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
          </div>
          <h2 id="visit-evidence-heading" className="text-xs font-semibold text-slate-800">
            Visit evidence
          </h2>
          {!loading && !error && (
            <span className="visits-status-chip visits-status-chip--evidence">
              {items.length}
            </span>
          )}
        </div>
        {!loading && (
          <button
            type="button"
            onClick={load}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-emerald-700 transition-colors"
            title="Refresh evidence"
            aria-label="Refresh evidence"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="visits-detail-card__body">
        {loading && (
          <div className="visits-evidence__grid" aria-busy="true" aria-label="Loading evidence">
            {Array.from({ length: 3 }).map((_, i) => (
              <EvidenceCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && error && (
          <ErrorRetry compact message={error} onRetry={load} />
        )}

        {!loading && !error && items.length === 0 && (
          <EmptyState
            icon={Paperclip}
            title="No evidence uploaded"
            subtitle="Field agents can attach photos, documents, voice notes, and text from the mobile app."
          />
        )}

        {!loading && !error && items.length > 0 && (
          <div className="visits-evidence__grid">
            {items.map((item) => (
              <EvidenceCard
                key={item.id}
                item={item}
                onPreviewImage={setPreview}
              />
            ))}
          </div>
        )}
      </div>

      <ImagePreviewModal item={preview} onClose={() => setPreview(null)} />
    </section>
  );
}
