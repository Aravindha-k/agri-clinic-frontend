import { useCallback, useEffect, useState } from "react";
import {
  Paperclip,
  Image as ImageIcon,
  FileText,
  File,
  Mic,
  StickyNote,
  Download,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  X,
  User,
  Clock,
  HardDrive,
} from "lucide-react";
import { getVisitAttachments } from "../../api/visit.api";
import { PageLoader } from "../ui/command";
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
          <div className="rounded-xl bg-white p-8 text-center text-gray-500">
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
        className={`w-full h-28 rounded-lg border flex items-center justify-center ${toneClasses(meta.tone)}`}
      >
        <Icon className="w-10 h-10 opacity-80" strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      className="w-full h-28 rounded-lg object-cover border border-gray-100 bg-gray-50"
      onError={onBroken}
    />
  );
}

function EvidenceCard({ item, onPreviewImage }) {
  const [imgBroken, setImgBroken] = useState(false);
  const meta = KIND_META[item.kind] || KIND_META[ATTACHMENT_KIND.OTHER];
  const Icon = meta.icon;
  const canOpen = item.url && item.kind !== ATTACHMENT_KIND.TEXT;

  return (
    <article className="list-card-surface p-3.5 flex flex-col gap-3 h-full">
      {item.kind === ATTACHMENT_KIND.IMAGE ? (
        <button
          type="button"
          className="block w-full text-left rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-emerald-400"
          onClick={() => onPreviewImage(item)}
          disabled={!item.url && !item.thumbnailUrl}
        >
          <AttachmentThumb item={item} broken={imgBroken} onBroken={() => setImgBroken(true)} />
        </button>
      ) : item.kind === ATTACHMENT_KIND.TEXT ? (
        <div className={`rounded-lg border p-3 min-h-[7rem] ${toneClasses(meta.tone)}`}>
          <p className="text-sm text-gray-800 whitespace-pre-wrap break-words line-clamp-6">
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
          <Icon className="w-3.5 h-3.5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate" title={item.filename}>
            {item.filename}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">{meta.label}</p>
        </div>
      </div>

      <dl className="space-y-1.5 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-gray-300 shrink-0" />
          <dd className="truncate">{item.uploadedBy}</dd>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
          <dd>{item.uploadedAtLabel}</dd>
        </div>
        <div className="flex items-center gap-2">
          <HardDrive className="w-3.5 h-3.5 text-gray-300 shrink-0" />
          <dd>{item.fileSizeLabel}</dd>
        </div>
      </dl>

      {item.kind === ATTACHMENT_KIND.AUDIO && item.url && (
        <audio controls preload="metadata" className="w-full h-9" src={item.url}>
          Your browser does not support audio playback.
        </audio>
      )}

      {item.kind === ATTACHMENT_KIND.TEXT && item.textContent && item.description && (
        <p className="text-xs text-gray-500 border-t border-gray-50 pt-2 line-clamp-2">
          {item.description}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mt-auto pt-1">
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
              <ExternalLink className="w-3.5 h-3.5" />
              Open
            </a>
            <a
              href={item.url}
              download={item.filename}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm text-gray-600 inline-flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          </>
        )}
        {item.kind === ATTACHMENT_KIND.TEXT && !item.url && (
          <span className="text-[11px] text-gray-400">View only</span>
        )}
        {!item.url && item.kind !== ATTACHMENT_KIND.TEXT && (
          <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded-md">
            File link unavailable
          </span>
        )}
      </div>
    </article>
  );
}

export default function VisitEvidenceSection({ visitId, onCountChange }) {
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

  return (
    <section className="section-card overflow-hidden" aria-labelledby="visit-evidence-heading">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="list-meta-icon list-meta-icon--crop">
            <Paperclip className="w-3.5 h-3.5" strokeWidth={2} />
          </div>
          <h2 id="visit-evidence-heading" className="text-xs font-semibold text-gray-800">
            Visit Evidence / Attachments
          </h2>
          {!loading && !error && (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          )}
        </div>
        {!loading && (
          <button
            type="button"
            onClick={load}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-emerald-700"
            title="Refresh evidence"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="panel-body">
        {loading && (
          <div className="py-8">
            <PageLoader label="Loading evidence…" compact wrap={false} />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-start gap-2 text-sm text-red-700 flex-1">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              {error}
            </div>
            <button type="button" onClick={load} className="btn btn-ghost btn-sm text-red-700">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="text-center py-10 px-4">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <Paperclip className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-600">No evidence uploaded for this visit.</p>
            <p className="text-xs text-gray-400 mt-1">
              Field agents can attach photos, documents, voice notes, and text from the mobile app.
            </p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
