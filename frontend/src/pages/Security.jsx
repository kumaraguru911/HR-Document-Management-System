import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { Card, EmptyState, PageHeader, StatusBadge } from "../components/ui";

function Security() {
  const navigate = useNavigate();
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [setupData, setSetupData] = useState(null);
  const [otpCode, setOtpCode] = useState("");
  const [disableOtp, setDisableOtp] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });

  const loadSecurity = async () => {
    try {
      const response = await api.get("/auth/me");
      setUser(response.data);
      localStorage.setItem("user", JSON.stringify(response.data));
    } catch (error) {
      const detail = error.response?.data?.detail || "Unable to load security settings.";
      setNotice({ type: "error", text: detail });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecurity();
  }, []);

  const start2FASetup = async () => {
    setWorking(true);
    setNotice({ type: "", text: "" });
    try {
      const response = await api.post("/auth/2fa/setup");
      setSetupData(response.data);
      setOtpCode("");
    } catch (error) {
      setNotice({ type: "error", text: error.response?.data?.detail || "Unable to start two-factor authentication setup." });
    } finally {
      setWorking(false);
    }
  };

  const confirm2FA = async (event) => {
    event.preventDefault();
    setWorking(true);
    setNotice({ type: "", text: "" });
    try {
      await api.post("/auth/2fa/confirm", { otp: otpCode });
      const nextUser = { ...user, is_2fa_enabled: true };
      setUser(nextUser);
      localStorage.setItem("user", JSON.stringify(nextUser));
      setSetupData(null);
      setOtpCode("");
      setNotice({ type: "success", text: "Two-factor authentication is enabled. Your account is now better protected." });
    } catch (error) {
      setNotice({ type: "error", text: error.response?.data?.detail || "Unable to verify that code. Please try again." });
    } finally {
      setWorking(false);
    }
  };

  const disable2FA = async (event) => {
    event.preventDefault();
    setWorking(true);
    setNotice({ type: "", text: "" });
    try {
      await api.post("/auth/2fa/disable", { otp: disableOtp });
      const nextUser = { ...user, is_2fa_enabled: false };
      setUser(nextUser);
      localStorage.setItem("user", JSON.stringify(nextUser));
      setDisableOtp("");
      setNotice({ type: "success", text: "Two-factor authentication has been disabled." });
    } catch (error) {
      setNotice({ type: "error", text: error.response?.data?.detail || "Unable to update two-factor authentication." });
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <EmptyState title="Loading security settings…" />;

  return (
    <div className="page-shell security-page">
      <PageHeader eyebrow="Account security" title="Keep your account protected" description="Use two-factor authentication to add a second verification step when you sign in." actions={<button className="secondary-btn" type="button" onClick={() => navigate(user.is_employee_profile ? "/employee/profile" : "/settings")}>Back to profile</button>} />

      {notice.text && <div className={`alert ${notice.type === "success" ? "alert-success" : "alert-error"}`} role="status">{notice.text}</div>}

      <div className="content-grid security-layout">
        <Card className={`security-status-card ${user.is_2fa_enabled ? "is-secure" : ""}`}>
          <span className="security-status-card__icon">{user.is_2fa_enabled ? "✓" : "!"}</span>
          <div>
            <p className="eyebrow">Two-factor authentication</p>
            <h2>{user.is_2fa_enabled ? "Protection is active" : "Add another layer of protection"}</h2>
            <p>{user.is_2fa_enabled ? "Your password and authenticator code are required to sign in." : "An authenticator app helps prevent unauthorized access to your account."}</p>
          </div>
          <StatusBadge status={user.is_2fa_enabled ? "Approved" : "Pending"}>{user.is_2fa_enabled ? "Enabled" : "Not enabled"}</StatusBadge>
        </Card>

        <Card as="aside" className="security-help-card">
          <h3>How it works</h3>
          <ol>
            <li>Open your authenticator app.</li>
            <li>Scan the QR code shown here.</li>
            <li>Enter the six-digit code to confirm.</li>
          </ol>
        </Card>
      </div>

      <Card className="security-action-card">
        {!user.is_2fa_enabled && !setupData && (
          <div className="security-action-card__intro">
            <div><h3>Set up two-factor authentication</h3><p className="panel-subtitle">You will need an authenticator app, such as Google Authenticator or Microsoft Authenticator.</p></div>
            <button className="primary-btn" type="button" onClick={start2FASetup} disabled={working}>{working ? "Preparing…" : "Set up 2FA"}</button>
          </div>
        )}

        {!user.is_2fa_enabled && setupData && (
          <form className="security-verify" onSubmit={confirm2FA}>
            <div><h3>Verify your authenticator</h3><p className="panel-subtitle">Scan this QR code, then enter the six-digit code generated by your app.</p></div>
            <div className="security-verify__content">
              <img className="qr-code" src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(setupData.provisioning_uri)}`} alt="QR code for two-factor authentication setup" />
              <div className="stack">
                <div className="field"><label htmlFor="security-otp">Authenticator code</label><input id="security-otp" type="text" inputMode="numeric" maxLength="6" value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" required /></div>
                <div className="settings-actions"><button className="primary-btn" type="submit" disabled={working || otpCode.length !== 6}>{working ? "Verifying…" : "Verify and enable"}</button><button className="ghost-btn" type="button" onClick={() => setSetupData(null)} disabled={working}>Cancel</button></div>
              </div>
            </div>
          </form>
        )}

        {user.is_2fa_enabled && (
          <form className="security-disable" onSubmit={disable2FA}>
            <div><h3>Two-factor authentication is enabled</h3><p className="panel-subtitle">To turn it off, verify your current authenticator code. We recommend keeping it enabled.</p></div>
            <div className="field"><label htmlFor="disable-security-otp">Current six-digit code</label><input id="disable-security-otp" type="text" inputMode="numeric" maxLength="6" value={disableOtp} onChange={(event) => setDisableOtp(event.target.value.replace(/\D/g, ""))} placeholder="000000" required /></div>
            <button className="secondary-btn" type="submit" disabled={working || disableOtp.length !== 6}>{working ? "Updating…" : "Disable 2FA"}</button>
          </form>
        )}
      </Card>
    </div>
  );
}

export default Security;
