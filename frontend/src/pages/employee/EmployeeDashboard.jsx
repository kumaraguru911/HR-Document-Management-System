import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { KpiWidget, Timeline } from "../../components/ui";

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
    if (["UPLOADED", "SUBMITTED", "IN_REVIEW", "UNDER_REVIEW"].includes(normalized)) {
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

  const today = new Date().toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

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
      <section className="page-header hero-banner onboarding-hero">
        <div className="hero-copy">
          <p className="eyebrow">Employee workspace</p>
          <h1>Welcome, {user.first_name || "there"}</h1>
          <p className="page-subtitle">
            Your onboarding journey is now organized into clear milestones, document requirements, and status updates.
          </p>
        </div>

        <div className="hero-panel-inline dashboard-summary">
          <div className="summary-date">
            
            <div>
              <p className="hero-label">Today</p>
              <strong>{today}</strong>
            </div>
          </div>
          <div>
            <p className="hero-label">Onboarding progress</p>
            <strong>{summary.progress}% complete</strong>
            <span>
              {summary.approved} approved • {summary.uploaded} uploaded • {summary.pending} pending
            </span>
          </div>
        </div>
      </section>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="empty-state">Preparing your onboarding overview...</div>
      ) : (
        <>
          <div className="card-grid">
            <KpiWidget label="Required items" value={summary.total} detail="Documents expected for onboarding." />
            <KpiWidget label="Uploaded" value={summary.uploaded} detail="Items you have already submitted." tone="green" />
            <KpiWidget label="Status" value={summary.pending > 0 ? "In progress" : "Ready"} detail="Your next action is clear and visible." tone={summary.pending > 0 ? "amber" : "green"} />
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
                    <div className="progress-step__icon">
                      {stage.tone === "complete" ? "✓" : stage.tone === "active" ? "•" : "○"}
                    </div>
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
                  <p className="panel-subtitle">Move straight to the next onboarding step.</p>
                </div>
              </div>
              <div className="stack">
                <button className="primary-btn" onClick={() => navigate("/employee/documents")}>Go to my documents</button>
                <button className="secondary-btn" onClick={() => navigate("/employee/notifications")}>Open notifications</button>
                <button className="ghost-btn" onClick={() => navigate("/employee/profile")}>Open profile</button>
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
                      <span className={`status-badge ${getStatusClass(document.status)}`}>
                        {getDisplayStatus(document.status)}
                      </span>
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
                <Timeline items={recentActivity.map((item) => ({ title: item.title, description: item.detail }))} />
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default EmployeeDashboard;
