import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import api from "../api/api";

const OTP_LENGTH = 6;

function SetupTwoFactor() {
  const navigate = useNavigate();
  const [secret, setSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(true);
  const inputRefs = useRef([]);

  useEffect(() => {
    const fetch2FASecret = async () => {
      try {
        const response = await api.post("/auth/2fa/setup");
        const { secret: totpSecret, provisioning_uri: provisioningUri } = response.data;
        setSecret(totpSecret);

        if (provisioningUri) {
          const dataUrl = await QRCode.toDataURL(provisioningUri);
          setQrCodeUrl(dataUrl);
        }
      } catch (err) {
        console.error("2FA setup error:", err);
        const detail = err.response?.data?.detail;
        setError(typeof detail === "string" ? detail : "Could not start 2FA setup. Please try again later.");
      } finally {
        setSetupLoading(false);
      }
    };

    fetch2FASecret();
  }, []);

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;

    const nextOtp = [...otp];
    nextOtp[index] = value;
    setOtp(nextOtp);
    setError("");

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === "Backspace") {
      if (otp[index]) {
        const nextOtp = [...otp];
        nextOtp[index] = "";
        setOtp(nextOtp);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      setError("");
    }
  };

  const handleConfirm = async (event) => {
    event.preventDefault();
    const otpValue = otp.join("");

    if (otpValue.length !== OTP_LENGTH) {
      setError("Please enter the full six-digit code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.post("/auth/2fa/confirm", { otp: otpValue });
      // Update user in localStorage to reflect 2FA status
      const userResponse = await api.get("/auth/me");
      localStorage.setItem("user", JSON.stringify(userResponse.data));
      navigate("/employee"); // Redirect to employee dashboard
    } catch (err) {
      console.error("2FA confirm error:", err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Invalid OTP. Please try again.");
      setOtp(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Optionally, you could make a call here to record that the user skipped.
    navigate("/employee");
  };

  if (setupLoading) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="form-panel">Loading 2FA setup...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="form-panel">
          <div>
            <p className="eyebrow">Enhance Your Security</p>
            <h2>Set up Two-Factor Authentication</h2>
            <p className="helper-text">
              Scan the QR code with your authenticator app (like Google Authenticator) and enter the code to enable 2FA.
            </p>
          </div>

          {qrCodeUrl && (
            <div style={{ textAlign: "center", margin: "20px 0" }}>
              <img src={qrCodeUrl} alt="2FA QR Code" />
              <p>
                Can't scan? Enter this code manually: <br />
                <strong>{secret}</strong>
              </p>
            </div>
          )}

          <form onSubmit={handleConfirm} className="stack">
            <div className="field">
              <label>One-time password</label>
              <div className="otp-inputs">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    disabled={loading}
                    aria-label={`OTP digit ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className="alert alert-error" role="alert">
                <span>{error}</span>
              </div>
            )}

            <button className="primary-btn" type="submit" disabled={loading || otp.join("").length !== OTP_LENGTH}>
              {loading ? "Verifying..." : "Enable 2FA"}
            </button>
          </form>

          <button className="ghost-btn" onClick={handleSkip} disabled={loading}>
            Skip for Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default SetupTwoFactor;