import { MapPin, MapPinOff } from "lucide-react";

export default function GpsIndicator({ latitude, longitude, compact = false }) {
  const has =
    latitude != null &&
    longitude != null &&
    latitude !== "" &&
    longitude !== "";

  if (compact) {
    return has ? (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
        <MapPin className="w-3 h-3" /> GPS
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
        <MapPinOff className="w-3 h-3" /> —
      </span>
    );
  }

  return has ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
      <span className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
        <MapPin className="w-3.5 h-3.5" />
      </span>
      Location on file
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
      <span className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
        <MapPinOff className="w-3.5 h-3.5" />
      </span>
      No GPS
    </span>
  );
}
