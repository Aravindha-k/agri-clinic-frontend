import {
  Calendar,
  Eye,
  Hash,
  LandPlot,
  Leaf,
  MapPin,
  Paperclip,
  Phone,
  User,
  MapPinOff,
} from "lucide-react";
import {
  asDisplayString,
  resolveVillageLabel,
} from "../../utils/displayValue";
import {
  resolveVisitCropDisplay,
  resolveVisitFieldNotes,
  resolveVisitProblemSeen,
  resolveVisitActionTaken,
  resolveVisitFollowUpDate,
  truncateVisitText,
  VISIT_FIELD_NOTES_LABEL,
  VISIT_NOT_ADDED,
  visitFieldIsMissing,
} from "../../utils/visitDisplay";
import {
  resolveVisitFarmer,
  visitWhenLabel,
  visitSubmittedLabel,
  visitLandLabel,
  visitEmployeeLabel,
} from "../../utils/visitFarmer";
import { resolveVisitAttachmentCount } from "../../utils/visitAttachments";
import ProfileAvatar from "../ui/ProfileAvatar";

function hasVisitGps(v) {
  const lat = Number(v?.latitude);
  const lng = Number(v?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function VisitFieldCell({ label, value }) {
  const missing = visitFieldIsMissing(value);
  return (
    <div className="visits-card__field">
      <p className="visits-card__field-label">{label}</p>
      <p className={`visits-card__field-value ${missing ? "visits-card__field-value--empty" : ""}`}>
        {asDisplayString(value, "—")}
      </p>
    </div>
  );
}

export default function VisitListCard({ visit: v, onView }) {
  const farmer = resolveVisitFarmer(v);
  const whenLabel = visitWhenLabel(v);
  const submittedAt = visitSubmittedLabel(v);
  const cropName = resolveVisitCropDisplay(v);
  const fieldNotes = truncateVisitText(resolveVisitFieldNotes(v), 96);
  const problemSeen = truncateVisitText(resolveVisitProblemSeen(v), 72);
  const actionTaken = truncateVisitText(resolveVisitActionTaken(v), 72);
  const followUpDate = resolveVisitFollowUpDate(v);
  const villageLabel = asDisplayString(
    farmer.village !== "—" ? farmer.village : resolveVillageLabel(v?.village ?? v?.village_name)
  );
  const land = asDisplayString(visitLandLabel(v));
  const employee = asDisplayString(visitEmployeeLabel(v));
  const attachmentCount = resolveVisitAttachmentCount(v);
  const hasGps = hasVisitGps(v);
  const hasFollowUp =
    followUpDate !== VISIT_NOT_ADDED || Boolean(v?.follow_up_required);

  return (
    <article
      className="visits-card group"
      onClick={() => onView(v.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView(v.id);
        }
      }}
      aria-label={`Visit ${v.id} — ${asDisplayString(farmer.name)}`}
    >
      <div className="visits-card__head">
        <span className="admin-card__chip font-mono">
          <Hash className="w-3 h-3" aria-hidden="true" />
          Visit {v.id}
        </span>
        <div className="visits-card__chips">
          {hasGps ? (
            <span className="visits-status-chip visits-status-chip--gps" title="GPS recorded">
              <MapPin className="w-3 h-3" aria-hidden="true" />
              GPS
            </span>
          ) : (
            <span className="visits-status-chip visits-status-chip--nogps" title="No GPS">
              <MapPinOff className="w-3 h-3" aria-hidden="true" />
              No GPS
            </span>
          )}
          {attachmentCount != null && attachmentCount > 0 && (
            <span
              className="visits-status-chip visits-status-chip--evidence"
              title={`${attachmentCount} attachment${attachmentCount === 1 ? "" : "s"}`}
            >
              <Paperclip className="w-3 h-3" aria-hidden="true" />
              {attachmentCount}
            </span>
          )}
          {hasFollowUp && (
            <span className="visits-status-chip visits-status-chip--followup" title="Follow-up scheduled">
              <Calendar className="w-3 h-3" aria-hidden="true" />
              Follow-up
            </span>
          )}
        </div>
      </div>

      <div className="visits-card__body">
        <div className="visits-card__farmer">
          <ProfileAvatar
            entity={v?.farmer ?? v}
            src={farmer.profilePhotoUrl}
            name={farmer.name !== "—" ? farmer.name : "Farmer"}
            size="md"
            variant="teal"
          />
          <div className="min-w-0 flex-1">
            <h2 className="visits-card__farmer-name">{asDisplayString(farmer.name)}</h2>
            <p className="visits-card__farmer-phone">
              <Phone className="w-3 h-3 shrink-0 opacity-60" aria-hidden="true" />
              {asDisplayString(farmer.phone)}
            </p>
            {submittedAt && (
              <p className="visits-card__submitted">Submitted {submittedAt}</p>
            )}
          </div>
        </div>

        <div className="visits-card__pills">
          <span className="visits-card__pill visits-card__pill--crop">
            <Leaf className="w-3 h-3" aria-hidden="true" />
            {cropName}
          </span>
          <span className="visits-card__pill visits-card__pill--location">
            <MapPin className="w-3 h-3" aria-hidden="true" />
            {villageLabel}
          </span>
          <span className="visits-card__pill visits-card__pill--land">
            <LandPlot className="w-3 h-3" aria-hidden="true" />
            {land}
          </span>
        </div>

        <div className="visits-card__fields">
          <VisitFieldCell label={VISIT_FIELD_NOTES_LABEL} value={fieldNotes} />
          <VisitFieldCell label="Problem" value={problemSeen} />
          <VisitFieldCell label="Action" value={actionTaken} />
          <VisitFieldCell label="Follow-up" value={followUpDate} />
        </div>
      </div>

      <div className="visits-card__footer">
        <div className="min-w-0 space-y-0.5">
          <p className="visits-card__meta-line">
            <Calendar className="w-3 h-3 shrink-0" aria-hidden="true" />
            {asDisplayString(whenLabel)}
          </p>
          <p className="visits-card__meta-line">
            <User className="w-3 h-3 shrink-0" aria-hidden="true" />
            {employee}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onView(v.id);
          }}
          className="btn btn-primary btn-sm shrink-0"
        >
          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
          View
        </button>
      </div>
    </article>
  );
}
