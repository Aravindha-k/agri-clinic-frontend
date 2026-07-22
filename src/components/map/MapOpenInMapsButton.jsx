import { ExternalLink } from "lucide-react";
import { buildGoogleMapsSearchUrl } from "../../utils/mapUrls";

/**
 * Consistent Open in Maps action for admin map pages.
 */
export default function MapOpenInMapsButton({
  lat,
  lng,
  label = "Open in Maps",
  ariaLabel,
  className = "btn btn-secondary btn-sm shrink-0 inline-flex items-center gap-1.5",
  disabled = false,
}) {
  const url = buildGoogleMapsSearchUrl(lat, lng);
  if (!url || disabled) {
    return (
      <button
        type="button"
        className={`${className} opacity-50 cursor-not-allowed`}
        disabled
        aria-label={ariaLabel ?? "Select a location to open in Google Maps"}
      >
        {label}
        <ExternalLink className="w-3 h-3" aria-hidden="true" />
      </button>
    );
  }

  const resolvedAria =
    ariaLabel ?? `Open location at ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)} in Google Maps`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={resolvedAria}
    >
      {label}
      <ExternalLink className="w-3 h-3" aria-hidden="true" />
    </a>
  );
}
