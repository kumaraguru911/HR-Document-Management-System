import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

function TwoFactor() {
  const navigate = useNavigate();

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    const challengeToken = sessionStorage.getItem("challenge_token");

    if (!challengeToken) {
      setError("Login session expired. Please login again.");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post("/auth/login/2fa", {
        challenge_token: challengeToken,
        otp: otp,
      });

      const accessToken = response.data.access_token;

      if (!accessToken) {
        setError("Access token was not returned.");
        return;
      }

      localStorage.setItem("access_token", accessToken);
      sessionStorage.removeItem("challenge_token");

      const userResponse = await api.get("/auth/me");
      const user = userResponse.data;
      localStorage.setItem("user", JSON.stringify(user));

      if (user.role === "HR") {
        navigate("/hr");
      } else if (user.role === "EMPLOYEE") {
        navigate("/employee");
      } else {
        setError("Unknown user role.");
      }
    } catch (err) {
      console.error("2FA error:", err);

      const detail = err.response?.data?.detail;

      setError(typeof detail === "string" ? detail : "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="hero-panel">
          <div className="brand-pill">Secure verification</div>
          <h1>Confirm your identity</h1>
          <p>Enter the one-time password sent to your registered email to continue securely.</p>
          <ul className="feature-list">
            <li>Fast and protected sign-in</li>
            <li>Used for HR and employee access</li>
            <li>Helps keep document records secure</li>
          </ul>
        </div>

        <div className="form-panel">
          <div>
            <p className="eyebrow">Two-factor authentication</p>
            <h2>Enter OTP</h2>
            <p className="helper-text">We sent a six-digit code to your email address.</p>
          </div>

          <form onSubmit={handleVerify} className="stack">
            <div className="field">
              <label htmlFor="otp">One-time password</label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                required
              />
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify code"}
            </button>
          </form>

          <button
            className="ghost-btn"
            type="button"
            onClick={() => {
              sessionStorage.removeItem("challenge_token");
              navigate("/login");
            }}
          >
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
}

export default TwoFactor;