import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import SplashScreen from "../components/SplashScreen";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

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
        navigate("/2fa");
        return;
      }

      if (response.data.access_token) {
        const token = response.data.access_token;

        localStorage.setItem("access_token", token);

        const meResponse = await api.get("/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const user = meResponse.data;
        localStorage.setItem("user", JSON.stringify(user));

        if (user.role === "HR") {
          navigate("/hr");
        } else if (user.role === "EMPLOYEE") {
          navigate("/employee");
        } else {
          setError("Unknown user role.");
        }

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

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="hero-panel">
          <div className="brand-pill">HR Document Management</div>
          <h1>Secure onboarding and document review in one workspace.</h1>
          <p>
            Employees submit required documents while HR tracks approvals,
            follows up on missing files, and keeps every step transparent.
          </p>
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
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            {error && <div className="alert alert-error">{error}</div>}

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
  );
}

export default Login;