import { Clock3, MapPin, UserRound } from "lucide-react";
import ProfileAvatar from "../ui/ProfileAvatar";
import MapOpenInMapsButton from "../map/MapOpenInMapsButton";
import { useLiveEmployeeLocation } from "../../hooks/useLiveEmployeeLocation";
import {
  canonicalDutyLabel,
  canonicalGpsLabel,
  hasLiveMapLocation,
  resolveCanonicalGpsStatusKey,
} from "../../utils/dutyTracking";
import {
  formatLiveRelativeTime,
  getLiveGpsRecordedAt,
} from "../../utils/liveEmployeeMarkerMeta";
import { formatCoordinates } from "../../utils/visitLocation";
import { empName } from "../../utils/trackingDisplay";
import { isValidTamilNaduCoordinate } from "../../utils/mapCoordinates";

/**
 * Selected employee location summary — primary detail view for Live Tracking.
 */
export default function LiveTrackingSelectedSummary({
  employee,
  onViewDetails,
  className = "",
}) {
  if (!employee) return null;

  const name = empName(employee);
  const code = employee.employee_code ?? employee.employee_id ?? null;
  const dutyLabel = canonicalDutyLabel(employee);
  const gpsLabel = canonicalGpsLabel(employee);
  const gpsKey = resolveCanonicalGpsStatusKey(employee);
  const hasLoc = hasLiveMapLocation(employee);
  const lat = Number(employee.latitude);
  const lng = Number(employee.longitude);
  const coordsValid =
    hasLoc && Number.isFinite(lat) && Number.isFinite(lng) && isValidTamilNaduCoordinate(lat, lng);
  const coordText = coordsValid ? formatCoordinates(lat, lng) : null;
  const recordedAt = getLiveGpsRecordedAt(employee);
  const relativeTime = formatLiveRelativeTime(recordedAt);
  const location = useLiveEmployeeLocation(employee, lat, lng, coordsValid);

  const locationTitle = location.hasAreaName
    ? location.title
    : coordsValid
      ? "Coordinates available"
      : null;

  return (
    <div className={`live-tracking-selected-summary ${className}`.trim()}>
      <div className="live-tracking-selected-summary__main">
        <ProfileAvatar entity={employee} name={name} size="md" variant="neutral" />
        <div className="live-tracking-selected-summary__body min-w-0">
          <div className="live-tracking-selected-summary__identity">
            <p className="live-tracking-selected-summary__name">{name}</p>
            {code ? <p className="live-tracking-selected-summary__code">{code}</p> : null}
          </div>
          <p className="live-tracking-selected-summary__status">
            {dutyLabel} · GPS {gpsLabel}
          </p>
          {!coordsValid ? (
            <p className="live-tracking-selected-summary__empty">No location received yet</p>
          ) : location.loading ? (
            <p className="live-tracking-selected-summary__loading">Resolving place name…</p>
          ) : (
            <>
              {locationTitle ? (
                <p className="live-tracking-selected-summary__place">
                  <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{locationTitle}</span>
                </p>
              ) : null}
              {coordText ? (
                <p className="live-tracking-selected-summary__coords">{coordText}</p>
              ) : null}
            </>
          )}
          {coordsValid && relativeTime ? (
            <p className="live-tracking-selected-summary__updated">
              <Clock3 className="w-3 h-3 shrink-0" aria-hidden="true" />
              Last updated {relativeTime}
            </p>
          ) : null}
        </div>
      </div>
      <div className="live-tracking-selected-summary__actions">
        {coordsValid ? (
          <MapOpenInMapsButton
            lat={lat}
            lng={lng}
            ariaLabel={`Open ${locationTitle ?? name} location in Google Maps`}
          />
        ) : null}
        {typeof onViewDetails === "function" ? (
          <button
            type="button"
            className="btn btn-secondary btn-sm inline-flex items-center gap-1.5"
            onClick={() => onViewDetails(employee)}
          >
            <UserRound className="w-3.5 h-3.5" aria-hidden="true" />
            View employee
          </button>
        ) : null}
      </div>
    </div>
  );
}
