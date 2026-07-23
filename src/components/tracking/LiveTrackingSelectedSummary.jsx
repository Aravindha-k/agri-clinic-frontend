import { Clock3, MapPin, UserRound } from "lucide-react";
import ProfileAvatar from "../ui/ProfileAvatar";
import MapOpenInMapsButton from "../map/MapOpenInMapsButton";
import { useLiveEmployeeLocation } from "../../hooks/useLiveEmployeeLocation";
import {
  canonicalDutyLabel,
  canonicalTrackingLabel,
  gpsHardwareLabel,
  permissionLabel,
  trackingServiceLabel,
  hasLiveMapLocation,
  resolveCanonicalTrackingStatusKey,
  isNoLocationYet,
  formatLastGpsUpdate,
  formatLastHeartbeat,
} from "../../utils/dutyTracking";
import {
  formatLiveRelativeTime,
  formatLiveExactIstCompact,
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
  const name = employee ? empName(employee) : "";
  const code = employee?.employee_code ?? employee?.employee_id ?? null;
  const dutyLabel = employee ? canonicalDutyLabel(employee) : "";
  const trackingLabel = employee ? canonicalTrackingLabel(employee) : "";
  const trackingKey = employee ? resolveCanonicalTrackingStatusKey(employee) : "unknown";
  const gpsHw = employee ? gpsHardwareLabel(employee) : null;
  const permission = employee ? permissionLabel(employee) : null;
  const service = employee ? trackingServiceLabel(employee) : null;
  const hasLoc = employee ? hasLiveMapLocation(employee) : false;
  const noLocation = employee ? isNoLocationYet(employee) || !hasLoc : true;
  const lat = Number(employee?.latitude);
  const lng = Number(employee?.longitude);
  const coordsValid =
    hasLoc && Number.isFinite(lat) && Number.isFinite(lng) && isValidTamilNaduCoordinate(lat, lng);
  const coordText = coordsValid ? formatCoordinates(lat, lng) : null;
  const recordedAt = getLiveGpsRecordedAt(employee);
  const relativeLocation = formatLiveRelativeTime(recordedAt) || (employee ? formatLastGpsUpdate(employee) : null);
  const exactLocation = formatLiveExactIstCompact(recordedAt);
  const heartbeatIso = employee?.last_heartbeat_at ?? employee?.last_heartbeat ?? null;
  const relativeHeartbeat =
    formatLiveRelativeTime(heartbeatIso) || (employee ? formatLastHeartbeat(employee) : null);
  const exactHeartbeat = formatLiveExactIstCompact(heartbeatIso);
  const location = useLiveEmployeeLocation(employee, lat, lng, coordsValid);

  if (!employee) return null;

  const locationTitle = location.hasAreaName
    ? location.title
    : coordsValid
      ? "Coordinates available"
      : null;

  const metaBits = [
    gpsHw ? `GPS ${gpsHw}` : null,
    permission ? `Permission ${permission}` : null,
    service ? `Service ${service}` : null,
  ].filter(Boolean);

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
            {dutyLabel} · {trackingLabel}
          </p>
          {metaBits.length ? (
            <p className="live-tracking-selected-summary__meta text-[11px] text-slate-500">
              {metaBits.join(" · ")}
            </p>
          ) : null}
          {noLocation || trackingKey === "no_location" ? (
            <p className="live-tracking-selected-summary__empty">Waiting for first GPS update</p>
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
          {relativeHeartbeat || exactHeartbeat ? (
            <p className="live-tracking-selected-summary__updated">
              <Clock3 className="w-3 h-3 shrink-0" aria-hidden="true" />
              Heartbeat{" "}
              {[relativeHeartbeat, exactHeartbeat].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          {coordsValid && (relativeLocation || exactLocation) ? (
            <p className="live-tracking-selected-summary__updated">
              <Clock3 className="w-3 h-3 shrink-0" aria-hidden="true" />
              Location{" "}
              {[relativeLocation, exactLocation].filter(Boolean).join(" · ")}
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
