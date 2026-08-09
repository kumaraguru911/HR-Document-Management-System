import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/api";
import AppShell from "../components/AppShell";

const routes = [
  { to: "/employee", label: "Dashboard", crumb: "Dashboard", end: true },
  { to: "/employee/documents", label: "My documents", crumb: "My documents" },
  { to: "/employee/vault", label: "Document vault", crumb: "Document vault" },
  { to: "/employee/notifications", label: "Notifications", crumb: "Notifications" },
  { to: "/employee/profile", label: "My profile", crumb: "My profile" },
];

function EmployeeLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("user") || "{}")); } catch { setUser({}); }
    api.get("/notifications/my").then((response) => setUnreadCount((response.data || []).filter((item) => !item.is_read).length)).catch(() => setUnreadCount(0));
  }, [location.pathname]);

  const crumb = useMemo(() => routes.find((route) => location.pathname === route.to)?.crumb || "Security", [location.pathname]);
  const logout = () => { localStorage.removeItem("access_token"); localStorage.removeItem("user"); sessionStorage.removeItem("challenge_token"); navigate("/login", { replace: true }); };

  return <AppShell
    areaLabel="Employee portal"
    brand={{ label: "OnboardIQ", short: "OI" }}
    subtitle="Your onboarding workspace"
    routes={routes}
    footer={(collapsed) => <><button className="secondary-btn" type="button" onClick={() => navigate("/employee/security")}>{collapsed ? "🔒" : "Security"}</button><button className="secondary-btn" type="button" onClick={logout}>{collapsed ? "↩" : "Sign out"}</button></>}
    topbar={<header className="page-topbar employee-topbar"><div><p className="ui-breadcrumb">Employee portal <span>/</span> {crumb}</p><h2>{crumb}</h2></div><div className="topbar-actions"><button type="button" className="notification-bell" aria-label="Open notifications" onClick={() => navigate("/employee/notifications")}>🔔{unreadCount > 0 && <b>{unreadCount > 9 ? "9+" : unreadCount}</b>}</button><div className="profile-menu"><button className="profile-chip" type="button" aria-expanded={profileOpen} onClick={() => setProfileOpen((value) => !value)}>{(user.first_name || user.email || "U").charAt(0).toUpperCase()}</button>{profileOpen && <div className="profile-menu__panel"><strong>{user.first_name || "Employee"}</strong><span>{user.email || "Signed in"}</span><button type="button" onClick={() => navigate("/employee/profile")}>View profile</button><button type="button" onClick={logout}>Sign out</button></div>}</div></div></header>}
  />;
}

export default EmployeeLayout;
