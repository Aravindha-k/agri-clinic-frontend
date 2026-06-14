import { useRef, useState } from "react";
import { FileText, Image as ImageIcon, Paperclip, Trash2, Upload } from "lucide-react";
import { validateVisitMediaFiles, VISIT_MEDIA_MAX_FILES } from "../../utils/visitMediaValidation";

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function fileIcon(file) {
  if (file.type?.startsWith("image/")) return ImageIcon;
  return FileText;
}

export default function VisitMediaUploadField({
  files = [],
  onChange,
  error,
  onValidationError,
  accept = "image/*,application/pdf,.doc,.docx,audio/*,video/*",
  maxFiles = VISIT_MEDIA_MAX_FILES,
}) {
  const inputRef = useRef(null);
  const [localError, setLocalError] = useState("");

  const addFiles = (list) => {
    const incoming = Array.from(list || []);
    if (!incoming.length) return;
    const next = [...files];
    for (const file of incoming) {
      if (next.length >= maxFiles) break;
      const key = `${file.name}-${file.size}-${file.lastModified}`;
      if (next.some((f) => f._key === key)) continue;
      const previewUrl = file.type?.startsWith("image/")
        ? URL.createObjectURL(file)
        : null;
      next.push({ file, previewUrl, _key: key });
    }
    const mediaErrors = validateVisitMediaFiles(next);
    const msg = mediaErrors.media || "";
    setLocalError(msg);
    onValidationError?.(msg);
    onChange(next);
  };

  const removeAt = (index) => {
    const item = files[index];
    if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
    const next = files.filter((_, i) => i !== index);
    const mediaErrors = validateVisitMediaFiles(next);
    const msg = mediaErrors.media || "";
    setLocalError(msg);
    onValidationError?.(msg);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div
        className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          error ? "border-red-300 bg-red-50/40" : "border-gray-200 bg-gray-50/60 hover:border-emerald-300"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept={accept}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Upload className="w-8 h-8 text-emerald-600 mx-auto mb-2" strokeWidth={1.75} />
        <p className="text-sm font-medium text-gray-800">Upload visit images or documents</p>
        <p className="text-xs text-gray-500 mt-1">Photos, PDF, Word, audio — up to {maxFiles} files</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn btn-secondary btn-sm mt-4"
        >
          <Paperclip className="w-4 h-4" /> Choose files
        </button>
      </div>

      {(error || localError) && (
        <p className="text-xs text-red-600 font-medium">{error || localError}</p>
      )}

      {files.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {files.map((item, index) => {
            const Icon = fileIcon(item.file);
            return (
              <li
                key={item._key}
                className="flex gap-3 p-3 rounded-xl border border-gray-100 bg-white shadow-sm"
              >
                <div className="w-16 h-16 rounded-lg bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Icon className="w-7 h-7 text-gray-400" strokeWidth={1.5} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate" title={item.file.name}>
                    {item.file.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatBytes(item.file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 self-start"
                  aria-label="Remove file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
