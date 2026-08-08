import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";

function AppShell({ areaLabel, brand, subtitle, routes, footer, topbar }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app-shell shared-app-shell">
      <aside className={`sidebar shared-sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-top">
          <div>
            <div className="brand-pill">{collapsed ? brand.short : brand.label}</div>
            {!collapsed && <><h2 className="sidebar-title">{areaLabel}</h2><p className="sidebar-subtitle">{subtitle}</p></>}
          </div>
          <button className="sidebar-toggle" type="button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed((value) => !value)}>
            {collapsed ? "›" : "‹"}
          </button>
        </div>
        <nav className="sidebar-nav" aria-label={`${areaLabel} navigation`}>
          {routes.map((route) => <NavLink key={route.to} to={route.to} end={route.end} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} title={route.label}><span className="nav-label">{route.label}</span></NavLink>)}
        </nav>
        <div className="sidebar-footer">{footer?.(collapsed)}</div>
      </aside>
      <main className="main-content">
        {topbar}
        <div className="page-content"><Outlet /></div>
      </main>
    </div>
  );
}

export default AppShell;
