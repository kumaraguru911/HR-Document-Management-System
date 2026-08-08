import { useEffect, useState } from "react";
import api from "../api/api";

function Settings() {
  const [user, setUser] = useState({});
  const [profileForm, setProfileForm] = useState({ email: "", first_name: "", last_name: "" });
  const [avatarPreview, setAvatarPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupData, setSetupData] = useState(null);
  const [otpCode, setOtpCode] = useState("");
  const [disableOtp, setDisableOtp] = useState("");

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
      setNotice({ type: "success", text: "Profile updated successfully." });
    } catch (error) {
      const detail = error.response?.data?.detail || "Unable to update profile.";
      setNotice({ type: "error", text: detail });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setAvatarPreview(dataUrl);
      localStorage.setItem("profile_picture", dataUrl);
      setNotice({ type: "success", text: "Profile picture updated locally." });
    };
    reader.readAsDataURL(file);
  };

  const start2FASetup = async () => {
    setSetupLoading(true);
    setNotice({ type: "", text: "" });

    try {
      const response = await api.post("/auth/2fa/setup");
      setSetupData(response.data);
      setSetupOpen(true);
      setOtpCode("");
    } catch (error) {
      const detail = error.response?.data?.detail || "Unable to start 2FA setup.";
      setNotice({ type: "error", text: detail });
    } finally {
      setSetupLoading(false);
    }
  };

  const confirm2FA = async (event) => {
    event.preventDefault();
    setSetupLoading(true);

    try {
      await api.post("/auth/2fa/confirm", { otp: otpCode });
      const nextUser = { ...user, is_2fa_enabled: true };
      setUser(nextUser);
      localStorage.setItem("user", JSON.stringify(nextUser));
      setNotice({ type: "success", text: "Two-factor authentication is now enabled." });
      setSetupOpen(false);
      setOtpCode("");
    } catch (error) {
      const detail = error.response?.data?.detail || "Unable to verify the code.";
      setNotice({ type: "error", text: detail });
    } finally {
      setSetupLoading(false);
    }
  };

  const disable2FA = async (event) => {
    event.preventDefault();
    setSetupLoading(true);

    try {
      await api.post("/auth/2fa/disable", { otp: disableOtp });
      const nextUser = { ...user, is_2fa_enabled: false };
      setUser(nextUser);
      localStorage.setItem("user", JSON.stringify(nextUser));
      setNotice({ type: "success", text: "Two-factor authentication has been disabled." });
      setDisableOtp("");
    } catch (error) {
      const detail = error.response?.data?.detail || "Unable to disable 2FA.";
      setNotice({ type: "error", text: detail });
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Account preferences</h1>
          <p className="page-subtitle">Manage your profile, security settings, and account controls in one place.</p>
        </div>
      </div>

      {notice.text ? <div className={`alert ${notice.type === "success" ? "alert-success" : "alert-error"}`}>{notice.text}</div> : null}

      {loading ? (
        <div className="empty-state">Loading your settings...</div>
      ) : (
        <div className="settings-stack">
          <section className="panel-card">
            <div className="panel-head">
              <div>
                <h3>Profile management</h3>
                <p className="panel-subtitle">Update your personal details and profile image.</p>
              </div>
            </div>

            <div className="settings-section">
              <div className="avatar-card">
                <div className="avatar-preview">
                  {avatarPreview ? <img src={avatarPreview} alt="Profile preview" /> : <span>{(user.first_name || user.email || "U").charAt(0).toUpperCase()}</span>}
                </div>
                <label className="secondary-btn avatar-upload-btn">
                  Upload profile picture
                  <input type="file" accept="image/*" onChange={handleAvatarChange} />
                </label>
              </div>

              <form className="stack" onSubmit={handleProfileSave}>
                <div className="field">
                  <label htmlFor="settings-email">Email</label>
                  <input id="settings-email" type="email" value={profileForm.email} onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))} required />
                </div>

                <div className="field">
                  <label htmlFor="settings-first-name">First name</label>
                  <input id="settings-first-name" type="text" value={profileForm.first_name} onChange={(event) => setProfileForm((current) => ({ ...current, first_name: event.target.value }))} />
                </div>

                <div className="field">
                  <label htmlFor="settings-last-name">Last name</label>
                  <input id="settings-last-name" type="text" value={profileForm.last_name} onChange={(event) => setProfileForm((current) => ({ ...current, last_name: event.target.value }))} />
                </div>

                <button className="primary-btn" type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save profile"}
                </button>
              </form>
            </div>
          </section>

          <section className="panel-card">
            <div className="panel-head">
              <div>
                <h3>Security settings</h3>
                <p className="panel-subtitle">Review your account security and authentication controls.</p>
              </div>
            </div>

            <div className="settings-section">
              <div className="info-stack">
                <div className="info-row">
                  <span>Role</span>
                  <strong>{user.role || "Unknown"}</strong>
                </div>
                <div className="info-row">
                  <span>Account status</span>
                  <strong>{user.is_active ? "Active" : "Pending"}</strong>
                </div>
                <div className="info-row">
                  <span>Two-factor authentication</span>
                  <strong>{user.is_2fa_enabled ? "Enabled" : "Disabled"}</strong>
                </div>
              </div>

              {!user.is_2fa_enabled ? (
                <div className="settings-actions">
                  <button className="primary-btn" type="button" onClick={start2FASetup} disabled={setupLoading}>
                    {setupLoading ? "Preparing..." : "Enable 2FA"}
                  </button>
                </div>
              ) : (
                <form className="stack" onSubmit={disable2FA}>
                  <div className="field">
                    <label htmlFor="disable-otp">Enter your current 6-digit code</label>
                    <input id="disable-otp" type="text" inputMode="numeric" maxLength="6" value={disableOtp} onChange={(event) => setDisableOtp(event.target.value.replace(/\D/g, ""))} />
                  </div>
                  <button className="secondary-btn" type="submit" disabled={setupLoading}>
                    {setupLoading ? "Disabling..." : "Disable 2FA"}
                  </button>
                </form>
              )}

              {setupOpen ? (
                <form className="stack settings-otp-card" onSubmit={confirm2FA}>
                  <div className="panel-head">
                    <div>
                      <h3>Verify 2FA setup</h3>
                      <p className="panel-subtitle">Scan the QR code with your authenticator app and enter the code below.</p>
                    </div>
                  </div>
                  {setupData?.provisioning_uri ? (
                    <img className="qr-code" src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(setupData.provisioning_uri)}`} alt="2FA QR code" />
                  ) : null}
                  <div className="field">
                    <label htmlFor="settings-otp">One-time code</label>
                    <input id="settings-otp" type="text" inputMode="numeric" maxLength="6" value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ""))} />
                  </div>
                  <div className="settings-actions">
                    <button className="primary-btn" type="submit" disabled={setupLoading}>
                      {setupLoading ? "Verifying..." : "Confirm 2FA"}
                    </button>
                    <button className="ghost-btn" type="button" onClick={() => setSetupOpen(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default Settings;

