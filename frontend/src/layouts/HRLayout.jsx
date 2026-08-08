import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/api";
import AppShell from "../components/AppShell";
import { Modal } from "../components/ui";
import { useToast } from "../components/ToastProvider";

const routes = [
  { to: "/hr", label: "Dashboard", crumb: "Dashboard", end: true },
  { to: "/hr/employees", label: "Employees", crumb: "Employees" },
  { to: "/hr/documents", label: "Review queue", crumb: "Review queue" },
  { to: "/hr/document-settings", label: "Document settings", crumb: "Document settings" },
  { to: "/hr/audit", label: "Audit logs", crumb: "Audit logs" },
  { to: "/hr/notifications", label: "Notifications", crumb: "Notifications" },
  { to: "/hr/settings", label: "Settings", crumb: "Settings" },
];

function HRLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const showToast = useToast();
  const [user, setUser] = useState({});
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ email: "", first_name: "", last_name: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const crumb = useMemo(() => routes.find((route) => location.pathname === route.to)?.crumb || "Document review", [location.pathname]);

  useEffect(() => { try { const stored = JSON.parse(localStorage.getItem("user") || "{}"); setUser(stored); setProfileForm({ email: stored.email || "", first_name: stored.first_name || "", last_name: stored.last_name || "" }); } catch { setUser({}); } }, []);
  const logout = () => { localStorage.removeItem("access_token"); localStorage.removeItem("user"); sessionStorage.removeItem("challenge_token"); navigate("/login", { replace: true }); };
  const openProfile = async () => { setIsProfileOpen(true); try { const { data } = await api.get("/auth/me"); setUser(data); localStorage.setItem("user", JSON.stringify(data)); setProfileForm({ email: data.email || "", first_name: data.first_name || "", last_name: data.last_name || "" }); } catch { showToast("Unable to load your profile right now.", "error"); } };
  const saveProfile = async (event) => { event.preventDefault(); setProfileLoading(true); try { const { data } = await api.patch("/auth/me", { email: profileForm.email, first_name: profileForm.first_name || null, last_name: profileForm.last_name || null }); setUser(data); localStorage.setItem("user", JSON.stringify(data)); setIsProfileOpen(false); showToast("Profile updated successfully."); } catch (error) { showToast(error.response?.data?.detail || "Unable to update profile.", "error"); } finally { setProfileLoading(false); } };

  return <><AppShell areaLabel="Human Resources" brand={{ label: "HR DMS", short: "HR" }} subtitle="Document operations center" routes={routes} footer={(collapsed) => <><button className="secondary-btn" onClick={openProfile} type="button">{collapsed ? "👤" : "View profile"}</button><button className="secondary-btn" onClick={logout} type="button">{collapsed ? "↩" : "Sign out"}</button></>} topbar={<header className="page-topbar"><div><p className="ui-breadcrumb">Operations center <span>/</span> {crumb}</p><h2>{crumb}</h2></div><div className="topbar-actions"><span className="topbar-chip">{user.role || "HR"}</span><button className="profile-chip" onClick={openProfile} type="button" aria-label="Open profile">{(user.first_name || user.email || "U").charAt(0).toUpperCase()}</button></div></header>} />
    {isProfileOpen && <Modal title="Profile details" description="Update your account information." onClose={() => setIsProfileOpen(false)}><form className="stack" onSubmit={saveProfile}><label className="field">Email<input type="email" value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} required /></label><label className="field">First name<input type="text" value={profileForm.first_name} onChange={(event) => setProfileForm({ ...profileForm, first_name: event.target.value })} /></label><label className="field">Last name<input type="text" value={profileForm.last_name} onChange={(event) => setProfileForm({ ...profileForm, last_name: event.target.value })} /></label><button className="primary-btn" type="submit" disabled={profileLoading}>{profileLoading ? "Saving…" : "Save changes"}</button></form></Modal>}
  </>;
}

export default HRLayout;
