import logo from "../assets/logo.png";

export default function RouteFallback({
  label = "Loading Kavya Agri Clinic\u2026",
}) {
  return (
    <div className="route-fallback" role="status" aria-live="polite" aria-busy="true">
      <div className="route-fallback__card">
        <div className="route-fallback__logo-wrap">
          <img src={logo} alt="" className="route-fallback__logo" />
        </div>
        <p className="route-fallback__title">Kavya Agri Clinic</p>
        <p className="route-fallback__label">{label}</p>
        <div className="route-fallback__progress" aria-hidden="true">
          <div className="route-fallback__progress-bar" />
        </div>
      </div>
    </div>
  );
}
