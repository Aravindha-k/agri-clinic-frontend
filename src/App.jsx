import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Visits from "./pages/Visits";
import VisitDetail from "./pages/VisitDetail";
import Issues from "./pages/Issues";
import Recommendations from "./pages/Recommendations";
import Tracking from "./pages/Tracking";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import Audit from "./pages/Audit";
import Masters from "./pages/Masters";
import MasterLocationsPage from "./pages/masters/MasterLocationsPage";
import MasterCropsPage from "./pages/masters/MasterCropsPage";
import MasterProblemCategories from "./pages/masters/MasterProblemCategories";
import ProtectedRoute from "./components/ProtectedRoute";
import FarmersList from "./pages/FarmersList";
import Layout from "./components/layout/Layout";
import CreateVisit from "./pages/CreateVisit";
import FarmerDetail from "./pages/FarmerDetail";

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
          <Route path="farmers/:id" element={<FarmerDetail />} />
          <Route path="visits" element={<Visits />} />
          <Route path="visits/create" element={<CreateVisit />} />
          <Route path="visits/:id" element={<VisitDetail />} />
          <Route path="visits/:id/edit" element={<VisitDetail mode="edit" />} />
          <Route path="crop-issues" element={<Issues />} />
          <Route path="recommendations" element={<Recommendations />} />
          <Route path="tracking" element={<Tracking />} />
          <Route path="reports" element={<Reports />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="audit" element={<Audit />} />
          <Route path="masters" element={<Masters />} />
          <Route path="masters/locations" element={<MasterLocationsPage />} />
          <Route path="masters/crops" element={<MasterCropsPage />} />
          <Route path="masters/problem-categories" element={<MasterProblemCategories />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;