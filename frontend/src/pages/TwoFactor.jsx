import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import Toast from "../components/Toast";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 45;

function TwoFactor() {
  const navigate = useNavigate();

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const inputRefs = useRef([]);
  const email = sessionStorage.getItem("verification_email") || "your email";

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [countdown]);

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) {
      return;
    }

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
        const nextOtp = [...otp];
        nextOtp[index - 1] = "";
        setOtp(nextOtp);
        inputRefs.current[index - 1]?.focus();
      }
      setError("");
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    const nextOtp = Array(OTP_LENGTH).fill("");

    pasted.split("").forEach((digit, index) => {
      nextOtp[index] = digit;
    });

    setOtp(nextOtp);
    setError("");
    const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleVerify = async (event) => {
    event.preventDefault();

    const otpValue = otp.join("");

    if (otpValue.length !== OTP_LENGTH) {
      setError("Please enter the full six-digit code.");
      return;
    }

    setError("");
    setLoading(true);

    const challengeToken = sessionStorage.getItem("challenge_token");

    if (!challengeToken) {
      setError("Your verification session has expired. Please sign in again.");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post("/auth/login/2fa", {
        challenge_token: challengeToken,
        otp: otpValue,
      });

      const accessToken = response.data.access_token;

      if (!accessToken) {
        setError("We could not verify your code. Please try again.");
        return;
      }

      localStorage.setItem("access_token", accessToken);
      sessionStorage.removeItem("challenge_token");

      const userResponse = await api.get("/auth/me");
      const user = userResponse.data;
      localStorage.setItem("user", JSON.stringify(user));

      setToastMessage("Verification successful");
      setToastType("success");

      window.setTimeout(() => {
        if (user.role === "HR") {
          navigate("/hr");
        } else if (user.role === "EMPLOYEE") {
          navigate("/employee");
        } else {
          setError("Unknown user role.");
        }
      }, 900);
    } catch (err) {
      console.error("2FA error:", err);

      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "That code is invalid or has expired. Please try again."
      );
      setOtp(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) {
      return;
    }

    const storedEmail = sessionStorage.getItem("verification_email");
    const storedPassword = sessionStorage.getItem("verification_password");

    if (!storedEmail || !storedPassword) {
      setError("Please sign in again to request a new verification code.");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/auth/login", {
        email: storedEmail,
        password: storedPassword,
      });

      if (response.data.requires_2fa) {
        sessionStorage.setItem("challenge_token", response.data.challenge_token);
        setOtp(Array(OTP_LENGTH).fill(""));
        setCountdown(RESEND_SECONDS);
        setError("");
        setToastMessage("A fresh verification code was sent");
        setToastType("info");
        inputRefs.current[0]?.focus();
      } else {
        setError("We could not request a new code right now. Please try again.");
      }
    } catch (err) {
      console.error("Resend error:", err);
      setError("We could not resend the verification code. Please try again.");
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
              <p className="helper-text">
                We sent a six-digit code to <strong>{email}</strong>.
              </p>
            </div>

            <form onSubmit={handleVerify} className="stack">
              <div className="field">
                <label>One-time password</label>
                <div className="otp-inputs" onPaste={handleOtpPaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength="1"
                      value={digit}
                      onChange={(event) => handleOtpChange(index, event.target.value)}
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      onFocus={(event) => event.target.select()}
                      disabled={loading}
                      aria-label={`OTP digit ${index + 1}`}
                    />
                  ))}
                </div>
                <p className="otp-hint">Enter the code to continue securely.</p>
              </div>

              {error && (
                <div className="alert alert-error" role="alert">
                  <span className="alert-icon">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <button className="primary-btn" type="submit" disabled={loading || otp.join("").length !== OTP_LENGTH}>
                {loading ? (
                  <span className="button-content">
                    <span className="button-loader" />
                    <span>Verifying...</span>
                  </span>
                ) : (
                  "Verify code"
                )}
              </button>
            </form>

            <div className="otp-footer">
              <span className="otp-countdown">
                {countdown > 0 ? `Resend in 00:${String(countdown).padStart(2, "0")}` : "You can request a new code now."}
              </span>
              <button
                className="otp-resend"
                type="button"
                onClick={handleResend}
                disabled={loading || countdown > 0}
              >
                {countdown > 0 ? "Resend code" : "Resend code"}
              </button>
            </div>

            <button
              className="ghost-btn"
              type="button"
              onClick={() => {
                sessionStorage.removeItem("challenge_token");
                navigate("/login");
              }}
              disabled={loading}
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default TwoFactor;