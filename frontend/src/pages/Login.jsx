import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import Toast from "../components/Toast";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      if (response.data.requires_2fa) {
        sessionStorage.setItem("challenge_token", response.data.challenge_token);
        sessionStorage.setItem("verification_email", email);
        sessionStorage.setItem("verification_password", password);
        setToastMessage("Verification code sent to your email");
        setToastType("info");

        setTimeout(() => {
          navigate("/2fa");
        }, 1200);
        return;
      }

      if (response.data.access_token) {
        const token = response.data.access_token;

        localStorage.setItem("access_token", token);

        if (rememberMe) {
          localStorage.setItem("rememberMe", "true");
          localStorage.setItem("savedEmail", email);
        }

        const meResponse = await api.get("/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const user = meResponse.data;
        localStorage.setItem("user", JSON.stringify(user));

        setToastMessage(`Welcome back, ${user.first_name || ""}!`);
        setToastType("success");

        setTimeout(() => {
          if (user.role === "HR") {
            navigate("/hr");
          } else if (user.role === "EMPLOYEE") {
            navigate("/employee");
          } else {
            setError("Unknown user role.");
          }
        }, 1200);

        return;
      }

      setError("Unexpected login response.");
    } catch (err) {
      console.error("Login error:", err);

      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Unable to login. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          duration={3000}
          onClose={() => setToastMessage("")}
        />
      )}
      <div className="auth-shell">
        <div className="auth-card">
          <div className="hero-panel">
            <div className="brand-pill">OnboardIQ</div>
            <h1>Secure onboarding and document review in one workspace.</h1>
            <p>
              Employees submit required documents while HR tracks approvals,
              follows up on missing files, and keeps every step transparent.
            </p>
            <div className="hero-illustration">
              <svg viewBox="0 0 240 180" className="illustration-svg">
                <rect x="20" y="20" width="200" height="140" rx="16" fill="#E0E7FF" stroke="#C7D2FE" strokeWidth="2" />
                <circle cx="140" cy="60" r="12" fill="#3B82F6" opacity="0.6" />
                <rect x="30" y="75" width="70" height="8" rx="4" fill="#A5B4FC" />
                <rect x="30" y="90" width="100" height="6" rx="3" fill="#C7D2FE" />
                <rect x="30" y="102" width="80" height="6" rx="3" fill="#C7D2FE" />
                <rect x="140" y="85" width="60" height="4" rx="2" fill="#A5B4FC" />
                <rect x="140" y="95" width="50" height="4" rx="2" fill="#C7D2FE" />
                <rect x="140" y="105" width="60" height="4" rx="2" fill="#C7D2FE" />
                <path d="M 20 135 L 220 135" stroke="#C7D2FE" strokeWidth="2" />
                <circle cx="50" cy="155" r="6" fill="#10B981" opacity="0.7" />
                <circle cx="90" cy="155" r="6" fill="#3B82F6" opacity="0.7" />
                <circle cx="130" cy="155" r="6" fill="#F59E0B" opacity="0.7" />
              </svg>
            </div>
            <ul className="feature-list">
              <li>Role-based access for HR and employees</li>
              <li>Structured document checklist and review flow</li>
              <li>Approval, rejection, and notification tracking</li>
            </ul>
          </div>

          <div className="form-panel">
            <div>
              <p className="eyebrow">Access portal</p>
              <h2>Welcome back</h2>
              <p className="helper-text">Sign in to continue to your workspace.</p>
            </div>

            <form onSubmit={handleLogin} className="stack">
              <div className="field">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  disabled={loading}
                />
              </div>

              <div className="field">
                <label htmlFor="password">Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="field-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                  />
                  <span>Remember me for 30 days</span>
                </label>
                <a href="#forgot-password" className="forgot-password-link">
                  Forgot password?
                </a>
              </div>

              {error && (
                <div className="alert alert-error" role="alert">
                  <span className="alert-icon">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <button className="primary-btn" type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <p className="helper-text">
              Protected by two-step verification for sensitive HR actions.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;