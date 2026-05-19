import { useState } from "react";
import {
  getProfileInitials,
  resolveProfilePhotoDisplayUrl,
  resolveProfilePhotoUrl,
} from "../../utils/profilePhoto";

const SIZE = {
  xs: { box: "w-7 h-7", text: "text-[10px]" },
  sm: { box: "w-8 h-8", text: "text-[11px]" },
  md: { box: "w-9 h-9", text: "text-xs" },
  lg: { box: "w-10 h-10", text: "text-sm" },
  xl: { box: "w-12 h-12", text: "text-sm" },
  "2xl": { box: "w-16 h-16", text: "text-lg" },
};

/**
 * Circular profile avatar — image when available, initials fallback (no broken icon).
 */
export default function ProfileAvatar({
  entity,
  src,
  name,
  size = "md",
  className = "",
  online,
  variant = "emerald",
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const photoUrl =
    src ??
    resolveProfilePhotoDisplayUrl(entity) ??
    (entity ? resolveProfilePhotoUrl(entity) : null);
  const displayName = name ?? (entity && typeof entity === "object" ? profileNameFromEntity(entity) : "");
  const initials = getProfileInitials(displayName, "?");
  const s = SIZE[size] ?? SIZE.md;
  const showImage = Boolean(photoUrl) && !imgFailed;

  const gradient =
    variant === "neutral"
      ? "bg-gradient-to-br from-gray-300 to-gray-400"
      : variant === "teal"
        ? "bg-gradient-to-br from-emerald-500 to-teal-600"
        : "bg-gradient-to-br from-emerald-400 to-teal-500";

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      {showImage ? (
        <img
          src={photoUrl}
          alt=""
          className={`${s.box} rounded-full object-cover ring-1 ring-gray-200/80 bg-gray-100`}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div
          className={`${s.box} rounded-full flex items-center justify-center font-semibold text-white ${gradient} ring-1 ring-white/20`}
          aria-hidden
        >
          <span className={s.text}>{initials}</span>
        </div>
      )}
      {online != null && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
            online ? "bg-emerald-500" : "bg-gray-400"
          }`}
        />
      )}
    </div>
  );
}

function profileNameFromEntity(entity) {
  return (
    entity.name ??
    entity.full_name ??
    entity.farmer_name ??
    (entity.first_name
      ? `${entity.first_name} ${entity.last_name || ""}`.trim()
      : null) ??
    entity.username ??
    ""
  );
}
