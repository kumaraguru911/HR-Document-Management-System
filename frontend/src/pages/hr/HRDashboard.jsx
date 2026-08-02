import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";

function HRDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState({});
  const [dashboardData, setDashboardData] = useState({
    pendingReview: 0,
    employees: 0,
    notifications: 0,
    auditTrail: 0,
  });
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser({});
      }
    }

    const loadDashboardData = async () => {
      try {
        const [pendingResponse, employeesResponse, notificationsResponse, auditResponse] = await Promise.all([
          api.get("/documents/pending"),
          api.get("/employees"),
          api.get("/notifications/my"),
          api.get("/audit"),
        ]);

        const unreadNotifications = notificationsResponse.data.filter((item) => !item.is_read).length;

        setDashboardData({
          pendingReview: pendingResponse.data.length,
          employees: employeesResponse.data.length,
          notifications: unreadNotifications,
          auditTrail: auditResponse.data.length,
        });

        setActivity(
          auditResponse.data.slice(0, 3).map((item) => ({
            title: item.action,
            meta: `${item.details || "Audit entry"} • ${new Date(item.created_at).toLocaleString()}`,
          }))
        );
      } catch (error) {
        console.error("Unable to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const today = new Date().toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const metrics = [
    { title: "Pending review", value: dashboardData.pendingReview, detail: "Documents awaiting HR approval.", tag: "Needs attention" },
    { title: "Employees", value: dashboardData.employees, detail: "Active records in the system.", tag: "On track" },
    { title: "Notifications", value: dashboardData.notifications, detail: "Unread updates for the team.", tag: "New" },
    { title: "Audit trail", value: dashboardData.auditTrail, detail: "Recent actions logged this week.", tag: "Updated" },
  ];

  const priorities = [
    {
      title: "Review onboarding packets",
      meta: `${dashboardData.pendingReview} submission${dashboardData.pendingReview === 1 ? "" : "s"} need${dashboardData.pendingReview === 1 ? "s" : ""} attention`,
    },
    {
      title: "Follow up on missing files",
      meta: `${dashboardData.notifications} unread update${dashboardData.notifications === 1 ? "" : "s"} available`,
    },
    {
      title: "Check latest audit activity",
      meta: `${dashboardData.auditTrail} audit event${dashboardData.auditTrail === 1 ? "" : "s"} recorded`,
    },
  ];

  return (
    <div className="page-shell">
      <section className="page-header hero-banner">
        <div className="hero-copy">
          <p className="eyebrow">HR dashboard</p>
          <h1>Welcome back, {user.first_name || "HR team"}</h1>
          <p className="page-subtitle">
            Keep onboarding moving with a coordinated view of review queues, employee activity, and follow-up tasks.
          </p>
        </div>
        <div className="hero-panel-inline">
          <p className="hero-label">Today</p>
          <strong>{today}</strong>
          <span>{loading ? "Loading live data..." : "Live data from the database"}</span>
        </div>
      </section>

      <section className="card-grid">
        {metrics.map((metric) => (
          <article key={metric.title} className="metric-card">
            <div className="metric-top">
              <p className="eyebrow">{metric.title}</p>
              <span className="status-badge pending">{metric.tag}</span>
            </div>
            <strong>{loading ? "—" : metric.value}</strong>
            <p>{metric.detail}</p>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <div className="panel-card panel-card--wide">
          <div className="panel-head">
            <div>
              <h3>Priority focus</h3>
              <p className="panel-subtitle">The most important work for the next review window.</p>
            </div>
            <span className="pill-chip">Live overview</span>
          </div>

          <div className="task-list">
            {priorities.map((item) => (
              <div key={item.title} className="task-item">
                <div className="task-icon" />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.meta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-head">
            <div>
              <h3>Quick actions</h3>
              <p className="panel-subtitle">Move between workflows without losing momentum.</p>
            </div>
          </div>
          <div className="stack">
            <button type="button" className="primary-btn" onClick={() => navigate("/hr/documents")}>Open review queue</button>
            <button type="button" className="secondary-btn" onClick={() => navigate("/hr/employees")}>View employee list</button>
            <button type="button" className="secondary-btn" onClick={() => navigate("/hr/notifications")}>Open notifications</button>
          </div>

          <div className="support-card">
            <p className="support-title">Need a quick handoff?</p>
            <p>Use the review queue to route missing documents before the next onboarding check-in.</p>
          </div>
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-head">
          <div>
            <h3>Recent activity</h3>
            <p className="panel-subtitle">Latest HR actions and employee updates.</p>
          </div>
          <button type="button" className="ghost-btn" onClick={() => navigate("/hr/audit")}>View all</button>
        </div>

        <div className="activity-list">
          {loading ? (
            <div className="empty-state">Loading activity from the database...</div>
          ) : activity.length > 0 ? (
            activity.map((item) => (
              <div key={`${item.title}-${item.meta}`} className="activity-item">
                <div className="activity-dot" />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.meta}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">No activity entries found yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}

export default HRDashboard;