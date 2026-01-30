// import { Navigate, Outlet } from "react-router-dom";

// export default function ProtectedRoute({ children }) {
//     const token = localStorage.getItem("access");

//     // ❌ NO TOKEN → LOGIN
//     if (!token) {
//         return <Navigate to="/login" replace />;
//     }

//     // ✅ TOKEN EXISTS → ALLOW
//     return children ? children : <Outlet />;
// }
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
    const token = localStorage.getItem("access");

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
