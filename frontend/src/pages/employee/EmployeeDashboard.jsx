import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";

function EmployeeDashboard() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  let user = {};
  try {
    user = JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    user = {};
  }

  const fetchDashboardData = async () => {
    try {
      setError("");
      const [documentsResponse, notificationsResponse] = await Promise.all([
        api.get("/documents/my/checklist"),
        api.get("/notifications/my"),
      ]);

      setDocuments(documentsResponse.data || []);
      setNotifications(notificationsResponse.data || []);
    } catch (err) {
      console.error("Dashboard data error:", err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Unable to load onboarding status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getDisplayStatus = (status) => {
    if (!status) return "Pending";

    const normalized = status.toUpperCase();
    if (normalized === "APPROVED") return "Approved";
    if (normalized === "REJECTED") return "Rejected";
    if (normalized === "UPLOADED" || normalized === "SUBMITTED" || normalized === "IN_REVIEW" || normalized === "UNDER_REVIEW") {
      return "Uploaded";
    }

    return "Pending";
  };

  const getStatusClass = (status) => {
    const displayStatus = getDisplayStatus(status).toLowerCase();
    return displayStatus === "uploaded" ? "uploaded" : displayStatus;
  };

  const summary = useMemo(() => {
    const total = documents.length;
    const approved = documents.filter((document) => getDisplayStatus(document.status) === "Approved").length;
    const uploaded = documents.filter((document) => getDisplayStatus(document.status) === "Uploaded").length;
    const pending = documents.filter((document) => getDisplayStatus(document.status) === "Pending").length;
    const progress = total ? Math.round(((approved * 1 + uploaded * 0.5) / total) * 100) : 0;

    return {
      total,
      approved,
      uploaded,
      pending,
      progress,
    };
  }, [documents]);

  const stages = useMemo(() => {
    const completed = summary.approved === summary.total && summary.total > 0;

    return [
      {
        label: "Invitation Sent",
        detail: "Your onboarding invite has been issued.",
        state: "Complete",
        tone: "complete",
      },
      {
        label: "Account Activated",
        detail: "Your account is ready for document submission.",
        state: "Complete",
        tone: "complete",
      },
      {
        label: "Documents Uploaded",
        detail: summary.uploaded > 0 ? `${summary.uploaded} submission${summary.uploaded > 1 ? "s" : ""} already in motion.` : "Upload the remaining documents to move forward.",
        state: summary.uploaded > 0 ? "In progress" : "Pending",
        tone: summary.uploaded > 0 ? "active" : "upcoming",
      },
      {
        label: "HR Verification",
        detail: summary.approved > 0 ? `${summary.approved} document${summary.approved > 1 ? "s" : ""} already cleared for review.` : "Awaiting HR review.",
        state: summary.approved > 0 ? "In review" : "Pending",
        tone: summary.approved > 0 ? "active" : "upcoming",
      },
      {
        label: "Onboarding Complete",
        detail: completed ? "Everything is approved and you are ready to start." : "Complete each required step to finish onboarding.",
        state: completed ? "Ready" : "Pending",
        tone: completed ? "complete" : "upcoming",
      },
    ];
  }, [summary]);

  const recentActivity = useMemo(() => {
    const activity = [];

    if (summary.pending > 0) {
      activity.push({
        title: "Next step",
        detail: `You still have ${summary.pending} required item${summary.pending > 1 ? "s" : ""} to complete before onboarding can move forward.`,
        tone: "important",
      });
    } else if (summary.approved === summary.total && summary.total > 0) {
      activity.push({
        title: "Onboarding is nearly complete",
        detail: "All required documents have been approved and your profile is ready for final confirmation.",
        tone: "good",
      });
    }

    notifications.slice(0, 3).forEach((notification) => {
      activity.push({
        title: notification.title || "Status update",
        detail: notification.message || "Your latest update is ready.",
        tone: notification.is_read ? "neutral" : "important",
      });
    });

    documents.slice(0, 3).forEach((document) => {
      const displayStatus = getDisplayStatus(document.status);
      activity.push({
        title: `${document.name} — ${displayStatus}`,
        detail: `Your ${document.name.toLowerCase()} is currently ${displayStatus.toLowerCase()}.`,
        tone: displayStatus === "Approved" ? "good" : displayStatus === "Rejected" ? "warning" : "neutral",
      });
    });

    return activity.slice(0, 5);
  }, [documents, notifications, summary]);

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
            Your onboarding journey is now organized into clear milestones, document requirements, and status updates.
          </p>
        </div>
        <div className="hero-panel-inline">
          <p>Signed in as</p>
          <strong>{user.email || "employee@company.com"}</strong>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="empty-state">Preparing your onboarding overview...</div>
      ) : (
        <>
          <section className="hero-banner onboarding-hero">
            <div className="hero-copy">
              <p className="hero-label">Onboarding progress</p>
              <h1>{summary.progress}% complete</h1>
              <p className="page-subtitle">
                {summary.pending > 0
                  ? `${summary.pending} required item${summary.pending > 1 ? "s" : ""} still need attention.`
                  : "Everything is moving smoothly and you are almost ready to go."}
              </p>
            </div>
            <div className="hero-panel-inline">
              <p>Current focus</p>
              <strong>{summary.pending > 0 ? "Finish remaining uploads" : "Awaiting final confirmation"}</strong>
              <span>{summary.approved} approved • {summary.uploaded} uploaded • {summary.pending} pending</span>
            </div>
          </section>

          <div className="card-grid">
            <div className="metric-card">
              <p className="eyebrow">Required items</p>
              <strong>{summary.total}</strong>
              <p>Documents expected for onboarding.</p>
            </div>
            <div className="metric-card">
              <p className="eyebrow">Updates</p>
              <strong>{notifications.length}</strong>
              <p>Notifications keeping you informed.</p>
            </div>
            <div className="metric-card">
              <p className="eyebrow">Status</p>
              <strong>{summary.pending > 0 ? "In progress" : "Ready"}</strong>
              <p>Your next action is clear and visible.</p>
            </div>
          </div>

          <div className="content-grid">
            <section className="panel-card panel-card--wide">
              <div className="panel-head">
                <div>
                  <h3>Onboarding progress tracker</h3>
                  <p className="panel-subtitle">A simple view of where you are and what comes next.</p>
                </div>
              </div>
              <div className="progress-tracker">
                {stages.map((stage) => (
                  <div className={`progress-step ${stage.tone}`} key={stage.label}>
                    <div className="progress-step__icon">{stage.tone === "complete" ? "✓" : stage.tone === "active" ? "•" : "○"}</div>
                    <div className="progress-step__body">
                      <div className="progress-step__label">
                        <strong>{stage.label}</strong>
                        <span className="progress-step__state">{stage.state}</span>
                      </div>
                      <p>{stage.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel-card">
              <div className="panel-head">
                <div>
                  <h3>Quick actions</h3>
                  <p className="panel-subtitle">Move straight to the next step.</p>
                </div>
              </div>
              <div className="stack">
                <button className="primary-btn" onClick={() => navigate("/employee/documents")}>Go to my documents</button>
                <button className="secondary-btn" onClick={() => navigate("/employee/notifications")}>Open notifications</button>
                <button className="ghost-btn" onClick={() => navigate("/settings")}>Open settings</button>
                <button className="ghost-btn" onClick={handleLogout}>Sign out</button>
              </div>
            </section>
          </div>

          <div className="content-grid onboarding-lower">
            <section className="panel-card panel-card--wide">
              <div className="panel-head">
                <div>
                  <h3>Required documents</h3>
                  <p className="panel-subtitle">Each item shows whether it is pending, uploaded, approved, or rejected.</p>
                </div>
              </div>

              {documents.length === 0 ? (
                <div className="empty-state">No document requirements were found for your profile yet.</div>
              ) : (
                <div className="document-list">
                  {documents.map((document) => (
                    <div className="document-row" key={document.document_type_id || document.name}>
                      <div>
                        <h4>{document.name}</h4>
                        <p>{document.description || "Upload this document to keep onboarding moving."}</p>
                      </div>
                      <span className={`status-badge ${getStatusClass(document.status)}`}>{getDisplayStatus(document.status)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="stack dashboard-side-stack">
              <section className="panel-card">
                <div className="panel-head">
                  <div>
                    <h3>Recent notifications</h3>
                    <p className="panel-subtitle">Helpful guidance from HR and the system.</p>
                  </div>
                </div>
                {notifications.length === 0 ? (
                  <div className="empty-state">You are all caught up.</div>
                ) : (
                  <div className="notification-list">
                    {notifications.slice(0, 3).map((notification) => (
                      <div className={`notification-card ${notification.is_read ? "" : "unread"}`} key={notification.id}>
                        <div>
                          <strong>{notification.title || "Update"}</strong>
                          <p>{notification.message || "Please review the latest update."}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="panel-card">
                <div className="panel-head">
                  <div>
                    <h3>Recent activity</h3>
                    <p className="panel-subtitle">A reassuring summary of your latest submissions.</p>
                  </div>
                </div>
                <div className="activity-list">
                  {recentActivity.map((item) => (
                    <div className="activity-item" key={`${item.title}-${item.detail}`}>
                      <span className={`activity-dot ${item.tone === "important" ? "dot-important" : item.tone === "warning" ? "dot-warning" : item.tone === "good" ? "dot-good" : ""}`} />
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default EmployeeDashboard;