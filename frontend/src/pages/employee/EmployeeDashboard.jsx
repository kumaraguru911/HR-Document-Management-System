import { useNavigate } from "react-router-dom";

function EmployeeDashboard() {
  const navigate = useNavigate();

  let user = {};
  try {
    user = JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    user = {};
  }

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("challenge_token");

    navigate("/login", { replace: true });
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Employee workspace</p>
          <h1>Welcome, {user.first_name || "there"}</h1>
          <p className="page-subtitle">
            Keep your onboarding documents up to date and stay informed about review progress.
          </p>
        </div>
        <div className="hero-panel-inline">
          <p>Signed in as</p>
          <strong>{user.email || "employee@company.com"}</strong>
        </div>
      </div>

      <div className="card-grid">
        <div className="metric-card">
          <p className="eyebrow">Document readiness</p>
          <strong>3 / 5</strong>
          <p>Required documents currently ready.</p>
        </div>
        <div className="metric-card">
          <p className="eyebrow">Recent updates</p>
          <strong>2</strong>
          <p>Notifications waiting for your attention.</p>
        </div>
        <div className="metric-card">
          <p className="eyebrow">Status</p>
          <strong>On track</strong>
          <p>Most of your checklist is already complete.</p>
        </div>
      </div>

      <div className="content-grid">
        <section className="panel-card">
          <div className="panel-head">
            <h3>Next steps</h3>
          </div>
          <ul className="stack-list">
            <li>Upload any remaining required documents in the checklist.</li>
            <li>Monitor the review status after each submission.</li>
            <li>Check notifications for feedback or missing information.</li>
          </ul>
        </section>

        <section className="panel-card">
          <div className="panel-head">
            <h3>Quick actions</h3>
          </div>
          <div className="stack">
            <button className="primary-btn" onClick={() => navigate("/employee/documents")}>Go to my documents</button>
            <button className="secondary-btn" onClick={() => navigate("/employee/notifications")}>Open notifications</button>
            <button className="ghost-btn" onClick={handleLogout}>Sign out</button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default EmployeeDashboard;