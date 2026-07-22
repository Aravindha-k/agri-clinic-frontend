import { Info } from "lucide-react";

/**
 * Small contextual note below admin maps.
 */
export default function MapInfoFooter({ message, icon: Icon = Info, className = "" }) {
  if (!message) return null;
  return (
    <footer className={`admin-map-info-footer ${className}`}>
      <Icon className="admin-map-info-footer__icon" aria-hidden="true" />
      <p className="admin-map-info-footer__text">{message}</p>
    </footer>
  );
}
