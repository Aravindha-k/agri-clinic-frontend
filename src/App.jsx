import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Visits from "./pages/Visits";
import Issues from "./pages/Issues";
import Recommendations from "./pages/Recommendations";
import Notifications from "./pages/Notifications";
import Masters from "./pages/Masters";
import MasterLocationsPage from "./pages/masters/MasterLocationsPage";
import MasterCropsPage from "./pages/masters/MasterCropsPage";
import MasterProblemCategories from "./pages/masters/MasterProblemCategories";
import MasterProblemItems from "./pages/masters/MasterProblemItems";
import ProtectedRoute from "./components/ProtectedRoute";
import FarmersList from "./pages/FarmersList";
import Layout from "./components/layout/Layout";
import CreateVisit from "./pages/CreateVisit";
import FarmerEditor from "./pages/FarmerEditor";
import EditVisit from "./pages/EditVisit";
import RouteFallback from "./components/RouteFallback";

const Reports = lazy(() => import("./pages/Reports"));
const Tracking = lazy(() => import("./pages/Tracking"));
const EmployeeRoutes = lazy(() => import("./pages/EmployeeRoutes"));
const VisitDetail = lazy(() => import("./pages/VisitDetail"));
const FarmerDetail = lazy(() => import("./pages/FarmerDetail"));
const Audit = lazy(() => import("./pages/Audit"));
const SecuritySessions = lazy(() => import("./pages/SecuritySessions"));

function LazyPage({ children, label }) {
  return <Suspense fallback={<RouteFallback label={label} />}>{children}</Suspense>;
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="employees" element={<Employees />} />
          <Route path="farmers" element={<FarmersList />} />
          <Route path="farmers/new" element={<FarmerEditor />} />
          <Route
            path="farmers/:id"
            element={
              <LazyPage label="Loading farmer profile\u2026">
                <FarmerDetail />
              </LazyPage>
            }
          />
          <Route path="farmers/:id/edit" element={<FarmerEditor mode="edit" />} />
          <Route path="visits" element={<Visits />} />
          <Route path="visits/create" element={<CreateVisit />} />
          <Route
            path="visits/:id"
            element={
              <LazyPage label="Loading visit\u2026">
                <VisitDetail />
              </LazyPage>
            }
          />
          <Route path="visits/:id/edit" element={<EditVisit />} />
          <Route path="crop-issues" element={<Issues />} />
          <Route path="recommendations" element={<Recommendations />} />
          <Route
            path="tracking"
            element={
              <LazyPage label="Loading live tracking\u2026">
                <Tracking />
              </LazyPage>
            }
          />
          <Route
            path="tracking/routes"
            element={
              <LazyPage label="Loading route history\u2026">
                <EmployeeRoutes />
              </LazyPage>
            }
          />
          <Route
            path="reports"
            element={
              <LazyPage label="Loading reports\u2026">
                <Reports />
              </LazyPage>
            }
          />
          <Route path="notifications" element={<Notifications />} />
          <Route
            path="audit"
            element={
              <LazyPage label="Loading audit log\u2026">
                <Audit />
              </LazyPage>
            }
          />
          <Route
            path="settings/security"
            element={
              <LazyPage label="Loading security monitoring\u2026">
                <SecuritySessions />
              </LazyPage>
            }
          />
          <Route path="admin/security" element={<Navigate to="/settings/security" replace />} />
          <Route path="masters" element={<Masters />} />
          <Route path="masters/locations" element={<MasterLocationsPage />} />
          <Route path="masters/crops" element={<MasterCropsPage />} />
          <Route path="masters/problem-categories" element={<MasterProblemCategories />} />
          <Route path="masters/problem-items" element={<MasterProblemItems />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
