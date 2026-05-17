import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { loading, token } = useAuth();
  const storedToken = typeof window !== "undefined" ? localStorage.getItem("access") : null;
  const hasToken = !!(token || storedToken);

  if (!hasToken && !loading) {
    return <Navigate to="/login" replace />;
  }

  // Token present: render shell immediately so sidebar/nav never disappears during profile fetch
  if (hasToken) {
    return children;
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--grad-page)" }}>
      <div className="text-sm text-gray-500 font-medium">Loading session…</div>
    </div>
  );
};

export default ProtectedRoute;
