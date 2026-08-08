import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState({});
  const [profileForm, setProfileForm] = useState({ email: "", first_name: "", last_name: "" });
  const [avatarPreview, setAvatarPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [notice, setNotice] = useState({ type: "", text: "" });

  const formatEmploymentType = (value) => value ? value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) : "—";

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
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

      const storedPicture = localStorage.getItem("profile_picture") || "";
      if (storedPicture) {
        setAvatarPreview(storedPicture);
      }
    } catch (error) {
      console.error("Unable to load profile", error);
      setNotice({ type: "error", text: "Unable to load your profile right now." });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice({ type: "", text: "" });

    try {
      const response = await api.patch("/auth/me", {
        email: profileForm.email,
        first_name: profileForm.first_name || null,
        last_name: profileForm.last_name || null,
      });

      const nextUser = response.data;
      setUser(nextUser);
      localStorage.setItem("user", JSON.stringify(nextUser));
      if (avatarPreview) localStorage.setItem("profile_picture", avatarPreview);
      setNotice({ type: "success", text: "Profile updated successfully." });
      setIsEditingProfile(false);
    } catch (error) {
      const detail = error.response?.data?.detail || "Unable to update profile.";
      setNotice({ type: "error", text: detail });
    } finally {
      setSaving(false);
    }
  };

  const cancelProfileEdit = () => {
    setProfileForm({
      email: user.email || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
    });
    setAvatarPreview(localStorage.getItem("profile_picture") || "");
    setNotice({ type: "", text: "" });
    setIsEditingProfile(false);
  };

  const handleAvatarChange = (event) => {
    if (!isEditingProfile) return;
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setAvatarPreview(dataUrl);
      setNotice({ type: "", text: "" });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>{user.is_employee_profile ? "My profile" : "Account preferences"}</h1>
          <p className="page-subtitle">Manage your personal details, employment information, and account security in one place.</p>
        </div>
      </div>

      {notice.text ? <div className={`alert ${notice.type === "success" ? "alert-success" : "alert-error"}`}>{notice.text}</div> : null}

      {loading ? (
        <div className="empty-state">Loading your settings...</div>
      ) : (
        <div className="settings-stack">
          {user.is_employee_profile && (
            <>
              <section className="panel-card profile-overview-card">
                <div className="profile-overview-card__identity">
                  <div className="avatar-preview profile-overview-card__avatar">
                    {avatarPreview ? <img src={avatarPreview} alt="Profile preview" /> : <span>{(user.first_name || user.email || "U").charAt(0).toUpperCase()}</span>}
                  </div>
                  <div>
                    <p className="eyebrow">Employee profile</p>
                    <h2>{`${user.first_name || ""} ${user.last_name || ""}`.trim() || "Employee"}</h2>
                    <p>{user.designation || "Employee"} {user.department ? `· ${user.department}` : ""}</p>
                    <div className="profile-overview-card__chips">
                      <span className="pill-chip">{user.employee_code || "Employee"}</span>
                      <span className={`status-badge ${user.is_active ? "approved" : "pending"}`}>{user.account_status || (user.is_active ? "Active" : "Pending")}</span>
                    </div>
                  </div>
                </div>
                <div className="profile-overview-card__progress">
                  <span>Onboarding completion</span>
                  <strong>{user.onboarding_completion || 0}%</strong>
                  <div className="profile-progress-bar"><i style={{ width: `${user.onboarding_completion || 0}%` }} /></div>
                  <small>{user.onboarding_approved || 0} of {user.onboarding_total || 0} required documents approved</small>
                </div>
              </section>

              <section className="panel-card profile-employment-card">
                <div className="panel-head">
                  <div>
                    <h3>Employment details</h3>
                    <p className="panel-subtitle">Information managed by your HR team.</p>
                  </div>
                </div>
                <div className="info-stack">
                  <div className="info-row"><span>Department</span><strong>{user.department || "—"}</strong></div>
                  <div className="info-row"><span>Designation</span><strong>{user.designation || "—"}</strong></div>
                  <div className="info-row"><span>Employment type</span><strong>{formatEmploymentType(user.employment_type)}</strong></div>
                  <div className="info-row"><span>Joining date</span><strong>{user.joining_date ? new Date(`${user.joining_date}T00:00:00`).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—"}</strong></div>
                </div>
              </section>
            </>
          )}

          <section className={`panel-card ${user.is_employee_profile ? "profile-edit-card" : ""}`}>
            <div className="panel-head">
              <div>
                <h3>Profile management</h3>
                <p className="panel-subtitle">Review your personal details and update them when needed.</p>
              </div>
              {!isEditingProfile && (
                <button className="secondary-btn" type="button" onClick={() => setIsEditingProfile(true)}>Edit profile</button>
              )}
            </div>

            <div className="settings-section">
              <div className="avatar-card">
                <div className="avatar-preview">
                  {avatarPreview ? <img src={avatarPreview} alt="Profile preview" /> : <span>{(user.first_name || user.email || "U").charAt(0).toUpperCase()}</span>}
                </div>
                <label className={`secondary-btn avatar-upload-btn ${isEditingProfile ? "" : "is-disabled"}`}>
                  Change profile picture
                  <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={!isEditingProfile} />
                </label>
              </div>

              <form className={`stack ${user.is_employee_profile ? "profile-edit-form" : ""}`} onSubmit={handleProfileSave}>
                <div className="field">
                  <label htmlFor="settings-email">Email</label>
                  <input id="settings-email" type="email" value={profileForm.email} onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))} disabled={!isEditingProfile} required />
                </div>

                <div className="field">
                  <label htmlFor="settings-first-name">First name</label>
                  <input id="settings-first-name" type="text" value={profileForm.first_name} onChange={(event) => setProfileForm((current) => ({ ...current, first_name: event.target.value }))} disabled={!isEditingProfile} />
                </div>

                <div className="field">
                  <label htmlFor="settings-last-name">Last name</label>
                  <input id="settings-last-name" type="text" value={profileForm.last_name} onChange={(event) => setProfileForm((current) => ({ ...current, last_name: event.target.value }))} disabled={!isEditingProfile} />
                </div>

                {isEditingProfile && (
                  <div className="profile-edit-form__actions">
                    <button className="secondary-btn" type="button" onClick={cancelProfileEdit} disabled={saving}>Cancel</button>
                    <button className="primary-btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
                  </div>
                )}
              </form>
            </div>
          </section>

          <section className={`panel-card ${user.is_employee_profile ? "profile-security-card" : ""}`}>
            <div className="panel-head">
              <div>
                <h3>Account security</h3>
                <p className="panel-subtitle">Manage two-factor authentication and review your account protection.</p>
              </div>
              <button className="primary-btn" type="button" onClick={() => navigate(user.is_employee_profile ? "/employee/security" : "/settings/security")}>Manage security</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default Settings;
