import { useEffect, useState } from "react";
import splashImage from "../assets/onboardiq-splash.png";

function SplashScreen({ onFinish }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false);
      if (onFinish) {
        onFinish();
      }
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [onFinish]);

  if (!visible) return null;

  return (
    <div className="splash-screen">
      <div className="splash-card">
        <img
          src={splashImage}
          alt="OnboardIQ splash screen"
          className="splash-image"
        />
        <div className="splash-content">
          <p className="splash-eyebrow">HR operations, simplified</p>
          <h1>OnboardIQ</h1>
          <p>Preparing your onboarding workspace...</p>
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;
