import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        sessionStorage.setItem(
          "challenge_token",
          response.data.challenge_token
        );

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

  return (
    <div>
      <h1>HR Document Management System</h1>

      <h2>Login</h2>

      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="email">Email</label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password">Password</label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

export default Login;