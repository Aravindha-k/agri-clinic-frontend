import ProfileAvatar from "../ui/ProfileAvatar";
import { formatCoordinates } from "../../utils/visitLocation";
import {
  getLiveEmployeeLocationLabel,
  getLiveGpsRecordedAt,
  formatLiveExactIst,
  formatLiveRelativeTime,
  liveGpsStatusToneClass,
  LOCATION_UNAVAILABLE,
} from "../../utils/liveEmployeeMarkerMeta";

/**
 * Rich click/tap popup for live tracking employee markers.
 * Location labels come from backend fields only (no reverse-geocode on poll).
 */
export default function LiveEmployeeMapPopup({
  name,
  code,
  emp,
  dutyLabel,
  gpsLabel,
  gpsKey,
  lastKnownNote = false,
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
  const gpsTone = liveGpsStatusToneClass(gpsKey);

  return (
    <div className="live-marker-popup">
      <div className="live-marker-popup__head">
        <ProfileAvatar entity={emp} name={name} size="md" variant="neutral" />
        <div className="live-marker-popup__identity min-w-0">
          <p className="live-marker-popup__name">{name}</p>
          {code ? <p className="live-marker-popup__code">{code}</p> : null}
        </div>
      </div>

      <div className="live-marker-popup__status-grid">
        {dutyLabel ? (
          <p className="live-marker-popup__row">
            <span className="live-marker-popup__label">Duty:</span>{" "}
            <span className="live-marker-popup__value">{dutyLabel}</span>
          </p>
        ) : null}
        {gpsLabel ? (
          <p className="live-marker-popup__row">
            <span className="live-marker-popup__label">GPS:</span>{" "}
            <span className={`live-marker-popup__gps ${gpsTone}`}>{gpsLabel}</span>
          </p>
        ) : null}
      </div>

      <div className="live-marker-popup__section">
        <p className="live-marker-popup__section-label">Last known location</p>
        <p className="live-marker-popup__location">
          {locationLabel || LOCATION_UNAVAILABLE}
        </p>
        {coordText ? (
          <p className="live-marker-popup__coords" title="Coordinates">
            {coordText}
          </p>
        ) : null}
      </div>

      {exactTime || relativeTime ? (
        <div className="live-marker-popup__section">
          <p className="live-marker-popup__section-label">Recorded</p>
          {exactTime ? <p className="live-marker-popup__value">{exactTime}</p> : null}
          {relativeTime ? (
            <p className="live-marker-popup__muted">{relativeTime}</p>
          ) : null}
        </div>
      ) : null}

      {heartbeatExact ? (
        <div className="live-marker-popup__section">
          <p className="live-marker-popup__section-label">Last heartbeat</p>
          <p className="live-marker-popup__value">{heartbeatExact}</p>
          {heartbeatRelative ? (
            <p className="live-marker-popup__muted">{heartbeatRelative}</p>
          ) : null}
        </div>
      ) : null}

      {lastKnownNote ? (
        <p className="live-marker-popup__note">Showing the last known location.</p>
      ) : null}
    </div>
  );
}
