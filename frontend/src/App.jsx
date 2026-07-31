import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/Login";
import TwoFactor from "./pages/TwoFactor";

import ProtectedRoute from "./components/ProtectedRoute";

import HRLayout from "./layouts/HRLayout";

import HRDashboard from "./pages/hr/HRDashboard";
import Employees from "./pages/hr/Employees";
import PendingDocuments from "./pages/hr/PendingDocuments";
import DocumentSettings from "./pages/hr/DocumentSettings";
import AuditLogs from "./pages/hr/AuditLogs";
import HRNotifications from "./pages/hr/HRNotifications";

import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import EmployeeDocuments from "./pages/EmployeeDocuments";
import Notifications from "./pages/employee/Notifications";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Default */}
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/2fa" element={<TwoFactor />} />

        {/* ================= HR ================= */}

        <Route
          path="/hr"
          element={
            <ProtectedRoute allowedRole="HR">
              <HRLayout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={<HRDashboard />}
          />

          <Route
            path="employees"
            element={<Employees />}
          />

          <Route
            path="documents"
            element={<PendingDocuments />}
          />

          <Route
            path="document-settings"
            element={<DocumentSettings />}
          />

          <Route
            path="audit"
            element={<AuditLogs />}
          />

          <Route
            path="notifications"
            element={<HRNotifications />}
          />
        </Route>

        {/* ============== EMPLOYEE ============== */}

        {/* Employee Dashboard */}
        <Route
          path="/employee"
          element={
            <ProtectedRoute allowedRole="EMPLOYEE">
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />

        {/* Employee Documents */}
        <Route
          path="/employee/documents"
          element={
            <ProtectedRoute allowedRole="EMPLOYEE">
              <EmployeeDocuments />
            </ProtectedRoute>
          }
        />

        {/* Employee Notifications */}
        <Route
          path="/employee/notifications"
          element={
            <ProtectedRoute allowedRole="EMPLOYEE">
              <Notifications />
            </ProtectedRoute>
          }
        />

        {/* Unknown URL */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;