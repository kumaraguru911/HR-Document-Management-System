import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/api";

function ActivateAccount() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token") || "";
  const providedName = searchParams.get("name") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [displayName, setDisplayName] = useState(providedName || "there");

  useEffect(() => {
    if (!token) {
      setError("This activation link is missing a valid token.");
    }
  }, [token]);

  const passwordChecks = useMemo(() => {
    const checks = [
      {
        label: "At least 8 characters",
        passed: password.length >= 8,
      },
      {
        label: "One uppercase letter",
        passed: /[A-Z]/.test(password),
      },
      {
        label: "One lowercase letter",
        passed: /[a-z]/.test(password),
      },
      {
        label: "One number",
        passed: /\d/.test(password),
      },
      {
        label: "One special character",
        passed: /[^A-Za-z0-9]/.test(password),
      },
    ];

    const score = checks.filter((item) => item.passed).length;
    let strengthLabel = "Very weak";

    if (score >= 4) {
      strengthLabel = "Strong";
    } else if (score === 3) {
      strengthLabel = "Good";
    } else if (score === 2) {
      strengthLabel = "Fair";
    } else if (score === 1) {
      strengthLabel = "Weak";
    }

    return { checks, score, strengthLabel };
  }, [password]);

  const confirmMismatch = confirmPassword && confirmPassword !== password;
  const isFormValid =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password) &&
    password === confirmPassword;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      setError("This activation link is missing a valid token.");
      return;
    }

    if (!isFormValid) {
      setError("Please create a strong password and confirm it before continuing.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/activate", {
        token,
        password,
      });

      const firstName = response.data.first_name;
      const lastName = response.data.last_name;
      const resolvedName = [firstName, lastName].filter(Boolean).join(" ");
      if (resolvedName) {
        setDisplayName(resolvedName);
      }

      setSuccess(true);
      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1800);
    } catch (err) {
      console.error("Activation error:", err);
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "We could not activate your account. Please request a new invitation."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card activation-card">
        <div className="hero-panel">
          <div className="brand-pill">Welcome aboard</div>
          <h1>Welcome{displayName ? `, ${displayName}` : ""}</h1>
          <p>
            You&apos;re joining the organization through OnboardIQ. Create a secure password to activate your account and open your onboarding workspace.
          </p>
          <div className="hero-illustration">
            <svg viewBox="0 0 240 180" className="illustration-svg">
              <rect x="24" y="24" width="192" height="132" rx="16" fill="#E0E7FF" stroke="#C7D2FE" strokeWidth="2" />
              <circle cx="148" cy="62" r="14" fill="#3B82F6" opacity="0.7" />
              <rect x="40" y="86" width="92" height="8" rx="4" fill="#818CF8" />
              <rect x="40" y="102" width="104" height="6" rx="3" fill="#C7D2FE" />
              <rect x="40" y="116" width="74" height="6" rx="3" fill="#C7D2FE" />
              <rect x="140" y="86" width="52" height="6" rx="3" fill="#A5B4FC" />
              <rect x="140" y="100" width="48" height="6" rx="3" fill="#C7D2FE" />
              <rect x="140" y="114" width="42" height="6" rx="3" fill="#C7D2FE" />
              <path d="M 28 142 L 212 142" stroke="#C7D2FE" strokeWidth="2" />
            </svg>
          </div>
          <ul className="feature-list">
            <li>Secure account activation in minutes</li>
            <li>Protect your onboarding documents and records</li>
            <li>Access your workspace with confidence</li>
          </ul>
        </div>

        <div className="form-panel">
          <div>
            <p className="eyebrow">Create your password</p>
            <h2>Set up your access</h2>
            <p className="helper-text">
              Choose a strong password to securely activate your account.
            </p>
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} className="stack">
              <div className="field">
                <label htmlFor="password">Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Create a strong password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="field">
                <label htmlFor="confirm-password">Confirm password</label>
                <div className="password-input-wrapper">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter your password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="strength-card">
                <div className="strength-row">
                  <span className="strength-label">Password strength</span>
                  <span className="strength-value">{password ? passwordChecks.strengthLabel : "Start typing"}</span>
                </div>
                <div className="strength-bar-group" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((index) => {
                    const active = index < passwordChecks.score;
                    return <span key={index} className={`strength-bar ${active ? "active" : ""}`} />;
                  })}
                </div>
                <ul className="strength-list">
                  {passwordChecks.checks.map((check) => (
                    <li key={check.label} className={check.passed ? "passed" : ""}>
                      <span>{check.passed ? "✓" : "•"}</span>
                      <span>{check.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {confirmMismatch && (
                <div className="alert alert-error" role="alert">
                  <span className="alert-icon">⚠</span>
                  <span>Passwords do not match.</span>
                </div>
              )}

              {error && (
                <div className="alert alert-error" role="alert">
                  <span className="alert-icon">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <button className="primary-btn" type="submit" disabled={loading || !isFormValid}>
                {loading ? "Activating account..." : "Activate account"}
              </button>
            </form>
          ) : (
            <div className="success-state">
              <div className="success-badge">✓</div>
              <h3>Account activated successfully</h3>
              <p>
                Welcome aboard, {displayName}. You&apos;ll be redirected to the sign-in page shortly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ActivateAccount;
