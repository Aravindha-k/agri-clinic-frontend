import { PageHeader } from "../../components/ui/command";
import { Fingerprint, Info } from "lucide-react";
import AttendanceTabs from "../../components/attendance/AttendanceTabs";

/**
 * Future biometric enrollment screen.
 *
 * The Phase 2B backend has no enrollment endpoints yet (biometrics adapter is
 * ManualTestVerifier only). This screen is intentionally disabled until the
 * scanner integration is implemented — do not add mock enrollment flows.
 */
export default function AttendanceEnrollment() {
  return (
    <div className="masters-admin page-container">
      <PageHeader
        title="Biometric Enrollment"
        subtitle="Enroll employee fingerprints / biometrics for verified attendance"
        badge={
          <span className="masters-admin-header__badge">
            <Fingerprint className="w-3 h-3" aria-hidden="true" />
            Attendance
          </span>
        }
      />
      <AttendanceTabs />

      <div className="masters-admin-table-card p-8 max-w-2xl">
        <div className="flex items-start gap-4">
          <div className="masters-admin-row-icon !w-11 !h-11">
            <Fingerprint className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-slate-800">
              Biometric enrollment is not yet available
            </h2>
            <p className="mt-1.5 text-[13.5px] text-slate-600 leading-relaxed">
              The attendance backend currently verifies events through manual test
              mode only. Fingerprint scanner integration and enrollment endpoints
              are planned for a future phase. Until then, all attendance events
              are recorded as <strong>TEST / MANUAL</strong> and are excluded from
              verified reports by default.
            </p>
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12.5px] text-slate-600">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" aria-hidden="true" />
              <span>
                When scanner integration ships, this screen will let admins capture
                and map employee biometric templates. No action is possible here
                today.
              </span>
            </div>
            <button type="button" disabled className="btn btn-primary btn-md mt-5 opacity-50 cursor-not-allowed">
              <Fingerprint className="w-4 h-4" aria-hidden="true" /> Enroll biometric (coming soon)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
