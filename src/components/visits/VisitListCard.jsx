import {
  ClipboardList,
  Calendar,
  Eye,
  Hash,
  LandPlot,
  Leaf,
  MapPin,
  Paperclip,
  Phone,
  User,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { GpsIndicator } from "../ui/command";
import {
  AdminCard,
  AdminCardAccent,
  AdminCardBody,
  AdminCardFooter,
  AdminCardMetaRow,
} from "../ui/AdminCard";
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

  return (
    <AdminCard className="visit-card visit-timeline-card" onClick={() => onView(v.id)}>
      <AdminCardAccent />
      <AdminCardBody>
        <div className="flex items-start justify-between gap-2">
          <span className="admin-card__chip font-mono">
            <Hash className="w-3 h-3" />
            Visit {v.id}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {attachmentCount != null && attachmentCount > 0 && (
              <span
                className="admin-card__chip"
                title={`${attachmentCount} attachment${attachmentCount === 1 ? "" : "s"}`}
              >
                <Paperclip className="w-3 h-3" />
                {attachmentCount}
              </span>
            )}
            <GpsIndicator latitude={v.latitude} longitude={v.longitude} compact />
          </div>
        </div>

        <div className="flex items-start gap-2">
          <ProfileAvatar
            entity={v?.farmer ?? v}
            src={farmer.profilePhotoUrl}
            name={farmer.name !== "—" ? farmer.name : "Farmer"}
            size="md"
            variant="teal"
          />
          <div className="min-w-0 flex-1">
            <h2 className="admin-card__title">{asDisplayString(farmer.name)}</h2>
            <p className="admin-card__meta flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3 shrink-0 opacity-60" />
              <span className="font-mono tabular-nums">{asDisplayString(farmer.phone)}</span>
            </p>
            {submittedAt && (
              <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Submitted {submittedAt}</p>
            )}
          </div>
        </div>

        <div className="admin-card__meta-list">
          <AdminCardMetaRow icon={MapPin} tone="location">
            {villageLabel}
          </AdminCardMetaRow>
          <AdminCardMetaRow icon={Leaf} tone="crop">
            {cropName}
          </AdminCardMetaRow>
          <AdminCardMetaRow icon={ClipboardList} tone="neutral">
            <span className={visitFieldIsMissing(fieldNotes) ? "text-gray-400 italic" : ""}>
              {VISIT_FIELD_NOTES_LABEL}: {fieldNotes}
            </span>
          </AdminCardMetaRow>
          <AdminCardMetaRow icon={AlertTriangle} tone="neutral">
            <span className={visitFieldIsMissing(problemSeen) ? "text-gray-400 italic" : ""}>
              Problem: {problemSeen}
            </span>
          </AdminCardMetaRow>
          <AdminCardMetaRow icon={CheckCircle2} tone="neutral">
            <span className={visitFieldIsMissing(actionTaken) ? "text-gray-400 italic" : ""}>
              Action: {actionTaken}
            </span>
          </AdminCardMetaRow>
          <AdminCardMetaRow icon={Calendar} tone="neutral">
            Follow-up: {followUpDate}
          </AdminCardMetaRow>
          <AdminCardMetaRow icon={LandPlot} tone="land">
            {land}
          </AdminCardMetaRow>
          <AdminCardMetaRow icon={Calendar} tone="neutral">
            {asDisplayString(whenLabel)}
          </AdminCardMetaRow>
          <AdminCardMetaRow icon={User} tone="neutral">
            {employee}
          </AdminCardMetaRow>
        </div>

        <AdminCardFooter>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onView(v.id);
            }}
            className="btn btn-primary btn-sm"
          >
            <Eye className="w-3.5 h-3.5" />
            View details
          </button>
        </AdminCardFooter>
      </AdminCardBody>
    </AdminCard>
  );
}
