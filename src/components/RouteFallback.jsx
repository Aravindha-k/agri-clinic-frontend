import Logo from "./Logo";

export default function RouteFallback({
  label = "Loading Kavya Agri Clinic\u2026",
}) {
  return (
    <div className="route-fallback" role="status" aria-live="polite" aria-busy="true">
      <div className="route-fallback__card">
        <Logo size="lg" variant="login" />
        <p className="route-fallback__title mt-3">Kavya Agri Clinic</p>
        <p className="route-fallback__label">{label}</p>
        <div className="route-fallback__progress" aria-hidden="true">
          <div className="route-fallback__progress-bar" />
        </div>
      </div>
    </div>
  );
}
