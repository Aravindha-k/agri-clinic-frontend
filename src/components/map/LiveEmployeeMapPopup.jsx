import { Link } from "react-router-dom";
import { Clock3, MapPin, Route, UserRound } from "lucide-react";
import ProfileAvatar from "../ui/ProfileAvatar";
import { formatCoordinates } from "../../utils/visitLocation";
import {
  getLiveEmployeeLocationLabel,
  getLiveGpsRecordedAt,
  formatLiveExactIst,
  formatLiveRelativeTime,
  LOCATION_UNAVAILABLE,
} from "../../utils/liveEmployeeMarkerMeta";

function dutyChipClass(dutyLabel) {
  const key = String(dutyLabel || "").toLowerCase();
  if (key.includes("working") || key.includes("on duty")) return "live-employee-chip--duty-working";
  return "live-employee-chip--duty-muted";
}

function gpsChipClass(gpsKey) {
  switch (gpsKey) {
    case "gps_active":
      return "live-employee-chip--gps-online";
    case "gps_stale":
      return "live-employee-chip--gps-stale";
    case "gps_offline":
      return "live-employee-chip--gps-offline";
    default:
      return "live-employee-chip--gps-none";
  }
}

/**
 * Detailed click/tap popup for live tracking markers.
 */
export default function LiveEmployeeMapPopup({
  name,
  code,
  emp,
  dutyLabel,
  gpsLabel,
  gpsKey,
  lastKnownNote = false,
  onViewEmployee,
  routeHref,
}) {
  const locationLabel = getLiveEmployeeLocationLabel(emp);
  const recordedAt = getLiveGpsRecordedAt(emp);
  const exactTime = formatLiveExactIst(recordedAt);
  const relativeTime = formatLiveRelativeTime(recordedAt);
  const heartbeatIso = emp?.last_heartbeat_at ?? emp?.last_heartbeat ?? null;
  const heartbeatExact = formatLiveExactIst(heartbeatIso);
  const heartbeatRelative = formatLiveRelativeTime(heartbeatIso);
  const lat = Number(emp?.latitude);
  const lng = Number(emp?.longitude);
  const coordText =
    Number.isFinite(lat) && Number.isFinite(lng) ? formatCoordinates(lat, lng) : null;

  return (
    <div className="live-employee-popup">
      <div className="live-employee-popup__accent" aria-hidden="true" />

      <div className="live-employee-popup__head">
        <ProfileAvatar entity={emp} name={name} size="lg" variant="neutral" />
        <div className="min-w-0">
          <p className="live-employee-popup__name">{name}</p>
          {code ? <p className="live-employee-popup__code">{code}</p> : null}
        </div>
      </div>

      <div className="live-employee-popup__chips">
        {dutyLabel ? (
          <span className={`live-employee-chip ${dutyChipClass(dutyLabel)}`}>
            {String(dutyLabel).toUpperCase()}
          </span>
        ) : null}
        {gpsLabel ? (
          <span className={`live-employee-chip ${gpsChipClass(gpsKey)}`}>
            GPS {String(gpsLabel).toUpperCase()}
          </span>
        ) : null}
      </div>

      <div className="live-employee-popup__section">
        <p className="live-employee-popup__section-label">
          <MapPin className="live-employee-popup__icon" aria-hidden="true" />
          Last known location
        </p>
        <p className="live-employee-popup__section-value">
          {locationLabel || LOCATION_UNAVAILABLE}
        </p>
        {coordText ? (
          <p className="live-employee-popup__coords">{coordText}</p>
        ) : null}
      </div>

      {exactTime || relativeTime ? (
        <div className="live-employee-popup__section">
          <p className="live-employee-popup__section-label">
            <Clock3 className="live-employee-popup__icon" aria-hidden="true" />
            Recorded
          </p>
          {exactTime ? <p className="live-employee-popup__section-value">{exactTime}</p> : null}
          {relativeTime ? <p className="live-employee-popup__muted">{relativeTime}</p> : null}
        </div>
      ) : null}

      {heartbeatExact ? (
        <div className="live-employee-popup__section">
          <p className="live-employee-popup__section-label">Last heartbeat</p>
          <p className="live-employee-popup__section-value">{heartbeatExact}</p>
          {heartbeatRelative ? (
            <p className="live-employee-popup__muted">{heartbeatRelative}</p>
          ) : null}
        </div>
      ) : null}

      {lastKnownNote ? (
        <p className="live-employee-popup__note">Showing the last known location.</p>
      ) : null}

      <div className="live-employee-popup__actions">
        {typeof onViewEmployee === "function" ? (
          <button type="button" className="live-employee-popup__btn live-employee-popup__btn--primary" onClick={onViewEmployee}>
            <UserRound className="w-3.5 h-3.5" aria-hidden="true" />
            View Employee
          </button>
        ) : null}
        {routeHref ? (
          <Link to={routeHref} className="live-employee-popup__btn live-employee-popup__btn--secondary">
            <Route className="w-3.5 h-3.5" aria-hidden="true" />
            View Route History
          </Link>
        ) : null}
      </div>
    </div>
  );
}
