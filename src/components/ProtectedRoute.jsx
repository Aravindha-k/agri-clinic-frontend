import { Navigate } from "react-router-dom";
import { useAuth, isAdminUser } from "../context/AuthContext";
import { PageLoader } from "./ui/command";

const ProtectedRoute = ({ children }) => {
  const { loading, token, user } = useAuth();
  const storedToken = typeof window !== "undefined" ? localStorage.getItem("access") : null;
  const hasToken = !!(token || storedToken);

  if (!hasToken && !loading) {
    return <Navigate to="/login" replace />;
  }

  if (loading && hasToken && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--grad-page)" }}>
        <PageLoader label="Signing you in…" fullScreen wrap={false} />
      </div>
    );
  }

  if (hasToken && user && !isAdminUser(user)) {
    return <Navigate to="/login" replace state={{ reason: "not_admin" }} />;
  }

  if (hasToken) {
    return children;
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--grad-page)" }}>
      <PageLoader label="Signing you in…" fullScreen wrap={false} />
    </div>
  );
};

export default ProtectedRoute;
