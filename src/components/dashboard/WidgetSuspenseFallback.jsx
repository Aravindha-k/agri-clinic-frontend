import { PageLoader } from "../ui/BrandLoader";

/** Branded fallback for lazy dashboard widgets */
export default function WidgetSuspenseFallback({ label = "Loading…" }) {
  return (
    <div className="section-card min-h-[180px] p-6">
      <PageLoader label={label} compact wrap={false} />
    </div>
  );
}
