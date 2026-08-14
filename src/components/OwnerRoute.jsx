import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canAccessOwnerSecurityScreens } from "../utils/roles";
import { PageLoader } from "./ui/command";
import { getAccessToken } from "../utils/authTokens";

/**
 * UI gate for owner/superuser-only screens.
 * Backend remains the authority — this only prevents rendering owner tools for staff admins.
 * Redirects before children mount so protected pages never flash.
 */
export default function OwnerRoute({ children, redirectTo = "/dashboard" }) {
  const { loading, token, user } = useAuth();
  const storedToken = typeof window !== "undefined" ? getAccessToken() : null;
  const hasToken = !!(token || storedToken);

  if (!hasToken && !loading) {
    return <Navigate to="/login" replace />;
  }

  /* Wait for profile before deciding — avoids flash of owner UI for kac.admin */
  if (loading || (hasToken && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--grad-page)" }}>
        <PageLoader label="Checking access…" fullScreen wrap={false} />
      </div>
    );
  }

  if (!canAccessOwnerSecurityScreens(user)) {
    return <Navigate to={redirectTo} replace state={{ reason: "owner_only" }} />;
  }

  return children;
}
