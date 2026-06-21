import { useRef, useState } from "react";
import { Camera, Loader2, AlertCircle } from "lucide-react";
import ProfileAvatar from "./ProfileAvatar";
import ProfilePhotoCropModal from "./ProfilePhotoCropModal";
import {
  profileDisplayName,
  resolveProfilePhotoUrl,
  profilePhotoVersion,
  cacheBustPhotoUrl,
} from "../../utils/profilePhoto";
import {
  validateProfilePhotoFile,
  PROFILE_PHOTO_ACCEPT,
  PROFILE_PHOTO_ACCEPT_LABEL,
  PROFILE_PHOTO_MAX_BYTES,
  resolvePhotoUploadError,
} from "../../utils/profileImageProcess";

const LEGACY_MAX_MB = 2;

/**
 * Upload / change profile photo with optional square crop + compression.
 * Multipart field: profile_photo
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
  enableCrop = false,
}) {
  const inputRef = useRef(null);
  const [localUrl, setLocalUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSource, setCropSource] = useState(null);
  const [cropFileName, setCropFileName] = useState("profile-photo");

  const storedUrl = photoUrlProp ?? resolveProfilePhotoUrl(entity);
  const displayUrl = localUrl ?? storedUrl;
  const displayName = nameProp ?? profileDisplayName(entity, "Profile");

  const handlePick = () => {
    if (!editable || uploading) return;
    inputRef.current?.click();
  };

  const resetCropState = () => {
    if (cropSource) URL.revokeObjectURL(cropSource);
    setCropSource(null);
    setCropOpen(false);
  };

  const uploadFile = async (file) => {
    if (!file || !onUpload) return;

    if (!enableCrop && file.size > LEGACY_MAX_MB * 1024 * 1024) {
      setError(`Photo must be under ${LEGACY_MAX_MB} MB.`);
      return;
    }

    if (enableCrop && file.size > PROFILE_PHOTO_MAX_BYTES) {
      setError("Compressed photo is still too large. Try a different image.");
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
      setError(resolvePhotoUploadError(err));
    } finally {
      setUploading(false);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validation = validateProfilePhotoFile(file);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    setError(null);

    if (enableCrop) {
      const src = URL.createObjectURL(file);
      const baseName = file.name?.replace(/\.[^.]+$/, "") || "profile-photo";
      setCropFileName(baseName);
      setCropSource(src);
      setCropOpen(true);
      return;
    }

    await uploadFile(file);
  };

  const handleCropConfirm = async (file) => {
    resetCropState();
    await uploadFile(file);
  };

  const helperText = enableCrop
    ? `${PROFILE_PHOTO_ACCEPT_LABEL} · cropped to 512×512 · under 1 MB`
    : `${PROFILE_PHOTO_ACCEPT_LABEL} · max ${LEGACY_MAX_MB} MB`;

  return (
    <>
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
            accept={PROFILE_PHOTO_ACCEPT}
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
            <p className="text-[10px] text-gray-400 mt-0.5">{helperText}</p>
          </div>
        )}

        {error && (
          <p className="flex items-start gap-1.5 text-xs text-red-600 max-w-xs">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            {error}
          </p>
        )}
      </div>

      <ProfilePhotoCropModal
        open={cropOpen}
        imageSrc={cropSource}
        fileName={cropFileName}
        onClose={resetCropState}
        onConfirm={handleCropConfirm}
      />
    </>
  );
}
