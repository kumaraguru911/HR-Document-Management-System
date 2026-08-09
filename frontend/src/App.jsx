import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import "./App.css";

import Login from "./pages/Login";
import TwoFactor from "./pages/TwoFactor";
import ActivateAccount from "./pages/ActivateAccount";

import ProtectedRoute from "./components/ProtectedRoute";
import SplashScreen from "./components/SplashScreen";
import { ToastProvider } from "./components/ToastProvider";

import HRLayout from "./layouts/HRLayout";
import EmployeeLayout from "./layouts/EmployeeLayout";

import HRDashboard from "./pages/hr/HRDashboard";
import Employees from "./pages/hr/Employees";
import PendingDocuments from "./pages/hr/PendingDocuments";
import DocumentReview from "./pages/hr/DocumentReview";
import DocumentSettings from "./pages/hr/DocumentSettings";
import AuditLogs from "./pages/hr/AuditLogs";
import HRNotifications from "./pages/hr/HRNotifications";
import Tasks from "./pages/hr/Tasks";
import DocumentVault from "./pages/hr/DocumentVault";

import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import EmployeeVault from "./pages/employee/EmployeeVault";
import EmployeeDocuments from "./pages/EmployeeDocuments";
import Notifications from "./pages/employee/Notifications";
import Settings from "./pages/Settings";
import Security from "./pages/Security";

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
      <Routes>

        {/* Default */}
        <Route path="/" element={<SplashScreen />} />

        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/2fa" element={<TwoFactor />} />
        <Route path="/activate" element={<ActivateAccount />} />

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
            path="documents/:id"
            element={<DocumentReview />}
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

          <Route path="tasks" element={<Tasks />} />
          <Route path="vault" element={<DocumentVault />} />

          <Route
            path="settings"
            element={<Settings />}
          />

          <Route
            path="settings/security"
            element={<Security />}
          />
        </Route>

        {/* ============== EMPLOYEE ============== */}

        {/* Employee Dashboard */}
        <Route path="/employee" element={<ProtectedRoute allowedRole="EMPLOYEE"><EmployeeLayout /></ProtectedRoute>}>
          <Route index element={<EmployeeDashboard />} />
          <Route path="documents" element={<EmployeeDocuments />} />
          <Route path="vault" element={<EmployeeVault />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Settings />} />
          <Route path="security" element={<Security />} />
        </Route>

        {/* Standalone settings routes retained for direct links */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRole={["HR", "EMPLOYEE"]}>
              <Settings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings/security"
          element={
            <ProtectedRoute allowedRole={["HR", "EMPLOYEE"]}>
              <Security />
            </ProtectedRoute>
          }
        />

        {/* Unknown URL */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />

      </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
