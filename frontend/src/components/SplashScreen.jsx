import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import splashImage from "../assets/onboardiq-splash.png";

function SplashScreen() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [statusText, setStatusText] = useState("Preparing your workspace...");

  useEffect(() => {
    let isMounted = true;
    const minimumDuration = 2000;
    const startedAt = Date.now();

    const redirectAfterDelay = (path) => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, minimumDuration - elapsed);

      window.setTimeout(() => {
        if (isMounted) {
          navigate(path, { replace: true });
        }
      }, remaining);
    };

    const verifySession = async () => {
      setVisible(true);
      setStatusText("Checking your access...");

      const token = localStorage.getItem("access_token");

      if (!token) {
        redirectAfterDelay("/login");
        return;
      }

      try {
        const response = await api.get("/auth/me");
        const user = response.data;

        localStorage.setItem("user", JSON.stringify(user));

        if (user.role === "HR") {
          setStatusText("Opening your HR workspace...");
          redirectAfterDelay("/hr");
        } else if (user.role === "EMPLOYEE") {
          setStatusText("Opening your employee workspace...");
          redirectAfterDelay("/employee");
        } else {
          redirectAfterDelay("/login");
        }
      } catch (error) {
        console.error("Session verification failed:", error);
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        redirectAfterDelay("/login");
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return (
    <div className="splash-screen">
      <div className={`splash-card ${visible ? "is-visible" : ""}`}>
        <img
          src={splashImage}
          alt="OnboardIQ logo"
          className="splash-image"
        />
        <div className="splash-content">
          <p className="splash-eyebrow">Trusted onboarding, made simple</p>
          <h1>OnboardIQ</h1>
          <p className="splash-tagline">Smart Employee Onboarding Platform</p>
          <div className="splash-status" role="status" aria-live="polite">
            <span className="splash-loader" />
            <span>{statusText}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;
