import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import api from "../api/api";

function HRLayout() {
  const navigate = useNavigate();

  const [user, setUser] = useState({});
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [profileForm, setProfileForm] = useState({ email: "", first_name: "", last_name: "" });
  const [profileMessage, setProfileMessage] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setProfileForm({
          email: JSON.parse(storedUser).email || "",
          first_name: JSON.parse(storedUser).first_name || "",
          last_name: JSON.parse(storedUser).last_name || "",
        });
      } catch {
        setUser({});
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("challenge_token");

    navigate("/login", { replace: true });
  };

  const openProfile = async () => {
    setProfileMessage("");
    setIsProfileOpen(true);

    try {
      const response = await api.get("/auth/me");
      const nextUser = response.data;
      setUser(nextUser);
      localStorage.setItem("user", JSON.stringify(nextUser));
      setProfileForm({
        email: nextUser.email || "",
        first_name: nextUser.first_name || "",
        last_name: nextUser.last_name || "",
      });
    } catch (error) {
      console.error("Unable to load profile", error);
      setProfileMessage("Unable to load your profile right now.");
    }
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setProfileLoading(true);
    setProfileMessage("");

    try {
      const response = await api.patch("/auth/me", {
        email: profileForm.email,
        first_name: profileForm.first_name || null,
        last_name: profileForm.last_name || null,
      });

      const nextUser = response.data;
      setUser(nextUser);
      localStorage.setItem("user", JSON.stringify(nextUser));
      setProfileForm({
        email: nextUser.email || "",
        first_name: nextUser.first_name || "",
        last_name: nextUser.last_name || "",
      });
      setProfileMessage("Profile updated successfully.");
    } catch (error) {
      const detail = error.response?.data?.detail || "Unable to update profile.";
      setProfileMessage(detail);
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-top">
          <div>
            <div className="brand-pill brand-pill-light">{isCollapsed ? "HR" : "HR DMS"}</div>
            {!isCollapsed && (
              <>
                <h2 className="sidebar-title">Human Resources</h2>
                <p className="sidebar-subtitle">Document operations center</p>
              </>
            )}
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setIsCollapsed((value) => !value)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>

        <nav className="sidebar-nav">
          <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/hr" end>
            <span className="nav-label">Dashboard</span>
          </NavLink>
          <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/hr/employees">
            <span className="nav-label">Employees</span>
          </NavLink>
          <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/hr/documents">
            <span className="nav-label">Pending Documents</span>
          </NavLink>
          <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/hr/document-settings">
            <span className="nav-label">Document Settings</span>
          </NavLink>
          <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/hr/audit">
            <span className="nav-label">Audit Logs</span>
          </NavLink>
          <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/hr/notifications">
            <span className="nav-label">Notifications</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          {!isCollapsed && <p className="sidebar-user">{user.email || "Signed in"}</p>}
          <button className="secondary-btn" onClick={openProfile} type="button">
            {isCollapsed ? "👤" : "View profile"}
          </button>
          <button className="secondary-btn" onClick={handleLogout} type="button">
            {isCollapsed ? "↩" : "Logout"}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="page-topbar">
          <div>
            <p className="eyebrow">Operations center</p>
            <h2>HR workflow dashboard</h2>
          </div>
          <div className="topbar-actions">
            <button className="profile-chip" onClick={openProfile} type="button" aria-label="Open profile">
              {user.first_name ? user.first_name.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : "U")}
            </button>
            <div className="topbar-chip">{user.role || "HR"}</div>
          </div>
        </div>

        <div className="page-content">
          <Outlet />
        </div>
      </main>

      {isProfileOpen && (
        <div className="profile-overlay" onClick={() => setIsProfileOpen(false)}>
          <div className="profile-modal" onClick={(event) => event.stopPropagation()}>
            <div className="panel-head">
              <div>
                <h3>Profile details</h3>
                <p className="panel-subtitle">Update your account information.</p>
              </div>
              <button className="ghost-btn" onClick={() => setIsProfileOpen(false)} type="button">
                Close
              </button>
            </div>

            <form className="stack" onSubmit={handleProfileSave}>
              <div className="field">
                <label htmlFor="profile-email">Email</label>
                <input id="profile-email" type="email" value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} required />
              </div>

              {user.is_employee_profile ? (
                <>
                  <div className="field">
                    <label htmlFor="profile-first-name">First name</label>
                    <input id="profile-first-name" type="text" value={profileForm.first_name} onChange={(event) => setProfileForm({ ...profileForm, first_name: event.target.value })} />
                  </div>
                  <div className="field">
                    <label htmlFor="profile-last-name">Last name</label>
                    <input id="profile-last-name" type="text" value={profileForm.last_name} onChange={(event) => setProfileForm({ ...profileForm, last_name: event.target.value })} />
                  </div>
                </>
              ) : (
                <p className="helper-text">Name updates are available for employee profiles tied to your account.</p>
              )}

              <div className="profile-meta">
                <span className="status-badge pending">{user.role || "ROLE"}</span>
                <span className="status-badge approved">{user.is_2fa_enabled ? "2FA enabled" : "2FA off"}</span>
              </div>

              {profileMessage && <div className={`alert ${profileMessage.includes("success") ? "alert-success" : "alert-error"}`}>{profileMessage}</div>}

              <button className="primary-btn" type="submit" disabled={profileLoading}>
                {profileLoading ? "Saving..." : "Save changes"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default HRLayout;