import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import api from "../api/api";

const routes = [
  { to: "/employee", label: "Dashboard", crumb: "Dashboard" },
  { to: "/employee/documents", label: "My documents", crumb: "My documents" },
  { to: "/employee/notifications", label: "Notifications", crumb: "Notifications" },
  { to: "/employee/profile", label: "My profile", crumb: "My profile" },
];

function EmployeeLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("user") || "{}")); } catch { setUser({}); }
    api.get("/notifications/my").then((response) => setUnreadCount((response.data || []).filter((item) => !item.is_read).length)).catch(() => setUnreadCount(0));
  }, [location.pathname]);

  const crumb = useMemo(() => routes.find((route) => location.pathname === route.to)?.crumb || "Security", [location.pathname]);
  const logout = () => { localStorage.removeItem("access_token"); localStorage.removeItem("user"); sessionStorage.removeItem("challenge_token"); navigate("/login", { replace: true }); };

  return (
    <div className="app-shell employee-app-shell">
      <aside className={`sidebar employee-sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-top"><div><div className="brand-pill">{collapsed ? "OI" : "OnboardIQ"}</div>{!collapsed && <><h2 className="sidebar-title">Employee portal</h2><p className="sidebar-subtitle">Your onboarding workspace</p></>}</div><button className="sidebar-toggle" type="button" aria-label="Toggle sidebar" onClick={() => setCollapsed((value) => !value)}>{collapsed ? "›" : "‹"}</button></div>
        <nav className="sidebar-nav">{routes.map((route) => <NavLink key={route.to} to={route.to} end={route.to === "/employee"} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} title={route.label}><span className="nav-label">{route.label}</span></NavLink>)}</nav>
        <div className="sidebar-footer"><button className="secondary-btn" type="button" onClick={() => navigate("/employee/security")}>{collapsed ? "🔒" : "Security"}</button><button className="secondary-btn" type="button" onClick={logout}>{collapsed ? "↩" : "Sign out"}</button></div>
      </aside>
      <main className="main-content">
        <header className="page-topbar employee-topbar"><div><p className="ui-breadcrumb">Employee portal <span>/</span> {crumb}</p><h2>{crumb}</h2></div><div className="topbar-actions"><button type="button" className="notification-bell" aria-label="Open notifications" onClick={() => navigate("/employee/notifications")}>🔔{unreadCount > 0 && <b>{unreadCount > 9 ? "9+" : unreadCount}</b>}</button><div className="profile-menu"><button className="profile-chip" type="button" onClick={() => setProfileOpen((value) => !value)}>{(user.first_name || user.email || "U").charAt(0).toUpperCase()}</button>{profileOpen && <div className="profile-menu__panel"><strong>{user.first_name || "Employee"}</strong><span>{user.email || "Signed in"}</span><button type="button" onClick={() => navigate("/employee/profile")}>View profile</button><button type="button" onClick={logout}>Sign out</button></div>}</div></div></header>
        <div className="page-content"><Outlet /></div>
      </main>
    </div>
  );
}

export default EmployeeLayout;
