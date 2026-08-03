import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";

function HRDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState({});
  const [pendingDocuments, setPendingDocuments] = useState([]);
  const [metrics, setMetrics] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    pendingReviews: 0,
    approvedToday: 0,
    rejectedToday: 0,
    pendingInvitations: 0,
  });
  const [activityFeed, setActivityFeed] = useState([]);
  const [reviewTrend, setReviewTrend] = useState([]);
  const [departmentBreakdown, setDepartmentBreakdown] = useState([]);
  const [onboardingProgress, setOnboardingProgress] = useState([]);
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

        const pendingDocs = pendingResponse.data || [];
        const employees = employeesResponse.data || [];
        const auditEntries = auditResponse.data || [];
        const unreadNotifications = notificationsResponse.data.filter((item) => !item.is_read).length;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const approvedToday = auditEntries.filter((item) => {
          const createdAt = new Date(item.created_at);
          return item.action === "DOCUMENT_APPROVED" && createdAt >= todayStart;
        }).length;

        const rejectedToday = auditEntries.filter((item) => {
          const createdAt = new Date(item.created_at);
          return item.action === "DOCUMENT_REJECTED" && createdAt >= todayStart;
        }).length;

        const activeEmployees = employees.filter((employee) => employee.is_active).length;
        const pendingInvitations = employees.filter((employee) => employee.account_status === "INVITED").length;

        const days = Array.from({ length: 6 }, (_, index) => {
          const date = new Date();
          date.setDate(date.getDate() - (5 - index));
          const key = date.toISOString().slice(0, 10);
          const count = auditEntries.filter((item) => {
            const itemDate = new Date(item.created_at);
            return item.action !== "DOCUMENT_UPLOADED" && itemDate.toISOString().slice(0, 10) === key;
          }).length;

          return {
            label: date.toLocaleDateString("en", { weekday: "short" }),
            value: count,
          };
        });

        const departmentGroups = employees.reduce((accumulator, employee) => {
          const dept = employee.department || "Unassigned";
          accumulator[dept] = (accumulator[dept] || 0) + 1;
          return accumulator;
        }, {});

        const departmentBreakdown = Object.entries(departmentGroups)
          .sort((left, right) => right[1] - left[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }));

        const onboardingProgress = [
          {
            label: "Activated",
            value: activeEmployees,
            total: employees.length || 1,
            caption: "Ready to work",
          },
          {
            label: "Invited",
            value: pendingInvitations,
            total: employees.length || 1,
            caption: "Awaiting setup",
          },
          {
            label: "Pending review",
            value: pendingDocs.length,
            total: Math.max(employees.length || 1, 1),
            caption: "Needs HR attention",
          },
        ];

        const feed = [
          ...auditEntries.slice(0, 4).map((item) => {
            const createdAt = new Date(item.created_at);
            const actionLabel = {
              DOCUMENT_UPLOADED: "Document uploaded",
              DOCUMENT_APPROVED: "Document approved",
              DOCUMENT_REJECTED: "Document rejected",
            }[item.action] || "Activity logged";

            return {
              title: actionLabel,
              meta: `${item.details || "Reviewed onboarding activity"} • ${createdAt.toLocaleString()}`,
              tone: item.action.toLowerCase(),
            };
          }),
          {
            title: "Invitations pending activation",
            meta: `${pendingInvitations} employee${pendingInvitations === 1 ? "" : "s"} awaiting their first login`,
            tone: "invite",
          },
          {
            title: "Accounts actively onboarded",
            meta: `${activeEmployees} employee${activeEmployees === 1 ? "" : "s"} are already live in OnboardIQ`,
            tone: "activate",
          },
        ];

        setMetrics({
          totalEmployees: employees.length,
          activeEmployees,
          pendingReviews: pendingDocs.length,
          approvedToday,
          rejectedToday,
          pendingInvitations,
          unreadNotifications,
        });
        setPendingDocuments(pendingDocs.slice(0, 3));
        setActivityFeed(feed.slice(0, 6));
        setReviewTrend(days);
        setDepartmentBreakdown(departmentBreakdown);
        setOnboardingProgress(onboardingProgress);
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

  const metricsCards = [
    { title: "Total employees", value: metrics.totalEmployees, detail: "Employees in the onboarding roster", tag: "Roster" },
    { title: "Active employees", value: metrics.activeEmployees, detail: "Accounts currently active in OnboardIQ", tag: "Live" },
    { title: "Pending reviews", value: metrics.pendingReviews, detail: "Documents waiting for HR review", tag: "Needs attention" },
    { title: "Approved today", value: metrics.approvedToday, detail: "Documents approved in the last 24 hours", tag: "Momentum" },
    { title: "Rejected today", value: metrics.rejectedToday, detail: "Documents sent back for follow-up", tag: "Follow-up" },
  ];

  return (
    <div className="page-shell">
      <section className="page-header hero-banner dashboard-hero">
        <div className="hero-copy">
          <p className="eyebrow">HR command center</p>
          <h1>Welcome back, {user.first_name || "HR team"}</h1>
          <p className="page-subtitle">
            Keep onboarding moving with a coordinated view of review queues, approvals, employee readiness, and the latest team activity.
          </p>
        </div>
        <div className="hero-panel-inline dashboard-summary">
          <p className="hero-label">Today</p>
          <strong>{today}</strong>
          <span>{loading ? "Loading live data..." : `${metrics.pendingReviews} reviews pending • ${metrics.unreadNotifications || 0} updates waiting`}</span>
        </div>
      </section>

      <section className="kpi-grid">
        {metricsCards.map((metric) => (
          <article key={metric.title} className="kpi-card">
            <div className="metric-top">
              <p className="eyebrow">{metric.title}</p>
              <span className="status-badge pending">{metric.tag}</span>
            </div>
            <strong>{loading ? "—" : metric.value}</strong>
            <p>{metric.detail}</p>
          </article>
        ))}
      </section>

      <section className="chart-grid">
        <article className="panel-card chart-card">
          <div className="panel-head">
            <div>
              <h3>Onboarding progress</h3>
              <p className="panel-subtitle">Current readiness across the onboarding pipeline.</p>
            </div>
          </div>
          <div className="chart-stack">
            {onboardingProgress.map((item) => {
              const percentage = Math.round((item.value / item.total) * 100);
              return (
                <div key={item.label} className="bar-row">
                  <div className="bar-row__label">
                    <strong>{item.label}</strong>
                    <span>{item.caption}</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${Math.min(percentage, 100)}%` }} />
                  </div>
                  <span className="bar-value">{item.value}</span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel-card chart-card">
          <div className="panel-head">
            <div>
              <h3>Review trends</h3>
              <p className="panel-subtitle">Weekly momentum across approvals and rejections.</p>
            </div>
          </div>
          <div className="trend-bars">
            {reviewTrend.map((day) => (
              <div key={day.label} className="trend-bar">
                <div className="trend-bar__fill" style={{ height: `${Math.max(12, day.value * 18)}px` }} />
                <span>{day.label}</span>
                <strong>{day.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card chart-card">
          <div className="panel-head">
            <div>
              <h3>Department mix</h3>
              <p className="panel-subtitle">Where employees are currently distributed.</p>
            </div>
          </div>
          <div className="department-list">
            {departmentBreakdown.map((department) => (
              <div key={department.name} className="department-item">
                <div className="department-meta">
                  <strong>{department.name}</strong>
                  <span>{department.count} employees</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill bar-fill--accent" style={{ width: `${(department.count / Math.max(metrics.totalEmployees, 1)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid dashboard-lower">
        <article className="panel-card panel-card--wide">
          <div className="panel-head">
            <div>
              <h3>Recent activity</h3>
              <p className="panel-subtitle">A live feed of uploads, approvals, rejections, invitations, and activations.</p>
            </div>
            <button type="button" className="ghost-btn" onClick={() => navigate("/hr/audit")}>View all</button>
          </div>

          <div className="timeline-list">
            {loading ? (
              <div className="empty-state">Loading activity from the database...</div>
            ) : activityFeed.length > 0 ? (
              activityFeed.map((item, index) => (
                <div key={`${item.title}-${index}`} className="timeline-item">
                  <div className={`timeline-dot timeline-dot--${item.tone}`} />
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
        </article>

        <div className="stack dashboard-side-stack">
          <article className="panel-card">
            <div className="panel-head">
              <div>
                <h3>Pending review</h3>
                <p className="panel-subtitle">Jump straight into the next document needs.</p>
              </div>
            </div>

            <div className="review-list">
              {pendingDocuments.length > 0 ? (
                pendingDocuments.map((document) => (
                  <div key={document.id} className="review-item">
                    <div>
                      <strong>{document.employee_name}</strong>
                      <p>{document.document_type_name}</p>
                    </div>
                    <span className="review-pill">Review</span>
                  </div>
                ))
              ) : (
                <div className="empty-state">No pending reviews right now.</div>
              )}
            </div>
            <button type="button" className="primary-btn" onClick={() => navigate("/hr/documents")}>Open review queue</button>
          </article>

          <article className="panel-card">
            <div className="panel-head">
              <div>
                <h3>Quick actions</h3>
                <p className="panel-subtitle">Move between workflows without losing momentum.</p>
              </div>
            </div>
            <div className="stack action-stack">
              <button type="button" className="primary-btn" onClick={() => navigate("/hr/employees")}>Invite employees</button>
              <button type="button" className="secondary-btn" onClick={() => navigate("/hr/documents")}>Review documents</button>
              <button type="button" className="secondary-btn" onClick={() => navigate("/hr/employees")}>Manage employees</button>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

export default HRDashboard;