// import { Routes, Route, Navigate } from "react-router-dom";
// import { useEffect } from "react";
// import { useLoader } from "./context/LoaderContext";
// import api, { setGlobalLoader } from "./api/axios.js";


// import AdminLayout from "./layouts/AdminLayout";
// import AdminDashboard from "./pages/admin/AdminDashboard";
// import Employees from "./pages/admin/Employees";
// import Visits from "./pages/admin/Visits";
// import AdminLogin from "./pages/auth/AdminLogin";
// import ProtectedRoute from "./routes/ProtectedRoute";
// import AgriActionLoader from "./components/AgriActionLoader";
// import Tracking from "./pages/admin/Tracking";

// import TrackingMap from "./pages/admin/TrackingMap";


// export default function App() {
//   const { loading, setLoading } = useLoader();

//   useEffect(() => {
//     setGlobalLoader(setLoading);
//   }, [setLoading]);

//   return (
//     <>
//       {loading && <AgriActionLoader />}

//       <Routes>
//         <Route path="/" element={<Navigate to="/login" />} />
//         <Route path="/login" element={<AdminLogin />} />

//         {/* optional backward support */}
//         <Route path="/dashboard" element={<Navigate to="/admin/dashboard" />} />

//         <Route
//           path="/admin"
//           element={
//             <ProtectedRoute>
//               <AdminLayout />
//             </ProtectedRoute>
//           }
//         >
//           <Route path="dashboard" element={<AdminDashboard />} />
//           <Route path="employees" element={<Employees />} />
//           <Route path="visits" element={<Visits />} />
//           <Route path="/admin/tracking" element={<Tracking />} />
//           <Route path="/admin/tracking/map/:userId" element={<TrackingMap />} />


//         </Route>
//       </Routes>
//     </>
//   );
// }
import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";

import { useLoader } from "./context/LoaderContext";
import { setGlobalLoader } from "./api/axios";

import ProtectedRoute from "./routes/ProtectedRoute";

import AdminLayout from "./layouts/AdminLayout";
import AdminLogin from "./pages/auth/AdminLogin";

import AdminDashboard from "./pages/admin/AdminDashboard";
import Employees from "./pages/admin/Employees";
import Visits from "./pages/admin/Visits";
import Tracking from "./pages/admin/Tracking";
import TrackingMap from "./pages/admin/TrackingMap";

import AgriActionLoader from "./components/AgriActionLoader";

export default function App() {
  const { loading, setLoading } = useLoader();

  useEffect(() => {
    setGlobalLoader(setLoading);
  }, [setLoading]);

  return (
    <>
      {loading && <AgriActionLoader />}

      <Routes>
        {/* DEFAULT */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* LOGIN */}
        <Route path="/login" element={<AdminLogin />} />

        {/* ADMIN */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="employees" element={<Employees />} />
          <Route path="visits" element={<Visits />} />
          <Route path="tracking" element={<Tracking />} />
          <Route path="tracking/map/:userId" element={<TrackingMap />} />
        </Route>

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </>
  );
}
