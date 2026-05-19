import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PageLoader } from "./ui/command";

const ProtectedRoute = ({ children }) => {
  const { loading, token } = useAuth();
  const storedToken = typeof window !== "undefined" ? localStorage.getItem("access") : null;
  const hasToken = !!(token || storedToken);

  if (!hasToken && !loading) {
    return <Navigate to="/login" replace />;
  }

  if (hasToken) {
    return children;
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--grad-page)" }}>
      <PageLoader label="Signing you in…" />
    </div>
  );
};

export default ProtectedRoute;
