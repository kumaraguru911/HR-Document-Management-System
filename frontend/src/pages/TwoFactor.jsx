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

    const challengeToken =
      sessionStorage.getItem("challenge_token");

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

      setError(
        typeof detail === "string"
          ? detail
          : "Invalid or expired OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Two-Factor Authentication</h1>

      <p>Enter the OTP sent to your registered email.</p>

      <form onSubmit={handleVerify}>
        <div>
          <label htmlFor="otp">OTP</label>

          <input
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />
        </div>

        {error && <p>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Verifying..." : "Verify OTP"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          sessionStorage.removeItem("challenge_token");
          navigate("/login");
        }}
      >
        Back to Login
      </button>
    </div>
  );
}

export default TwoFactor;