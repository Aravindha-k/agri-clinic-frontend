import { useRef, useState } from "react";
import { Camera, Loader2, AlertCircle } from "lucide-react";
import ProfileAvatar from "./ProfileAvatar";
import {
  profileDisplayName,
  resolveProfilePhotoUrl,
  profilePhotoVersion,
  cacheBustPhotoUrl,
} from "../../utils/profilePhoto";

const ACCEPT = "image/jpeg,image/png,image/webp,image/jpg";
const MAX_MB = 5;

/**
 * Upload / change profile photo with preview (multipart profile_photo).
 */
export default function ProfilePhotoUpload({
  entity,
  photoUrl: photoUrlProp,
  displayName: nameProp,
  onUpload,
  onPhotoUpdated,
  size = "xl",
  editable = true,
  variant = "emerald",
  online,
  className = "",
}) {
  const inputRef = useRef(null);
  const [localUrl, setLocalUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const storedUrl = photoUrlProp ?? resolveProfilePhotoUrl(entity);
  const displayUrl = localUrl ?? storedUrl;
  const displayName = nameProp ?? profileDisplayName(entity, "Profile");

  const handlePick = () => {
    if (!editable || uploading) return;
    inputRef.current?.click();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !onUpload) return;

    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Photo must be under ${MAX_MB} MB.`);
      return;
    }

    setError(null);
    const preview = URL.createObjectURL(file);
    setLocalUrl(preview);
    setUploading(true);

    try {
      const result = await onUpload(file);
      const baseUrl = resolveProfilePhotoUrl(result) ?? result?.profile_photo_url;
      const version = profilePhotoVersion(result) ?? Date.now();
      const nextUrl = baseUrl ? cacheBustPhotoUrl(baseUrl, version) : displayUrl;
      setLocalUrl(null);
      URL.revokeObjectURL(preview);
      onPhotoUpdated?.(nextUrl, {
        ...result,
        profile_photo_url: baseUrl ?? result?.profile_photo_url,
        profile_photo_updated_at: result?.profile_photo_updated_at ?? version,
      });
    } catch (err) {
      setLocalUrl(null);
      URL.revokeObjectURL(preview);
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.errors?.profile_photo ??
        err?.message ??
        "Failed to upload photo.";
      setError(typeof msg === "string" ? msg : "Failed to upload photo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`flex flex-col items-center sm:items-start gap-3 ${className}`}>
      <div className="relative">
        <ProfileAvatar
          entity={entity}
          src={displayUrl}
          name={displayName}
          size={size}
          variant={variant}
          online={online}
        />
        {editable && (
          <button
            type="button"
            onClick={handlePick}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md border-2 border-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            title="Change photo"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {editable && (
        <div className="text-center sm:text-left">
          <button
            type="button"
            onClick={handlePick}
            disabled={uploading}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : storedUrl ? "Change photo" : "Upload photo"}
          </button>
          <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG or WebP · max {MAX_MB} MB</p>
        </div>
      )}

      {error && (
        <p className="flex items-start gap-1.5 text-xs text-red-600 max-w-xs">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {error}
        </p>
      )}
    </div>
  );
}
