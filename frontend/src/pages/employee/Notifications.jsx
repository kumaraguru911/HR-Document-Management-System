import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";

const notificationTypeOptions = [
  { value: "ALL", label: "All notifications" },
  { value: "DOCUMENT_APPROVED", label: "Approved" },
  { value: "DOCUMENT_REJECTED", label: "Rejected" },
  { value: "DOCUMENT_REQUIRED", label: "Action required" },
  { value: "DOCUMENT_UPLOADED", label: "Uploaded" },
];

const notificationIcons = {
  DOCUMENT_APPROVED: "✅",
  DOCUMENT_REJECTED: "❌",
  DOCUMENT_REQUIRED: "📌",
  DOCUMENT_UPLOADED: "📤",
  ONBOARDING_MILESTONE: "🎯",
  ACCOUNT_UPDATED: "👤",
  ACCOUNT_SECURITY: "🔒",
};

const getNotificationTitle = (notification) => {
  if (!notification.document_name) return notification.title || "Update";

  const statusLabel = {
    DOCUMENT_APPROVED: "Approved",
    DOCUMENT_REJECTED: "Rejected",
    DOCUMENT_REQUIRED: "Required",
    DOCUMENT_UPLOADED: "Uploaded",
  }[notification.type];

  return statusLabel ? `${notification.document_name} ${statusLabel}` : notification.title || "Update";
};

const getNotificationMessage = (notification) => {
  if (!notification.document_name) return notification.message || "Your latest update is ready.";

  if (notification.type === "DOCUMENT_APPROVED") {
    return `Your ${notification.document_name} has been approved by HR.`;
  }

  if (notification.type === "DOCUMENT_REJECTED") {
    const reason = notification.message?.match(/rejected:\s*(.*)$/i)?.[1];
    return `Your ${notification.document_name} was rejected${reason ? `: ${reason}` : ". Please upload a replacement."}`;
  }

  if (notification.type === "DOCUMENT_REQUIRED") {
    return `Upload your ${notification.document_name} to complete this requirement.`;
  }

  return notification.message || `Your ${notification.document_name} was uploaded successfully.`;
};

function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const fetchNotifications = async () => {
    try {
      setError("");
      const response = await api.get("/notifications/my");
      setNotifications(response.data);
    } catch (err) {
      console.error("Notification fetch error:", err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (notificationId) => {
    try {
      setError("");
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === notificationId ? { ...notification, is_read: true } : notification
        )
      );
    } catch (err) {
      console.error("Mark as read error:", err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Unable to mark notification as read.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setError("");
      await api.patch("/notifications/read-all");
      setNotifications((previous) => previous.map((notification) => ({ ...notification, is_read: true })));
    } catch (err) {
      console.error("Mark all read error:", err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Unable to mark all as read.");
    }
  };

  const getNotificationDestination = (notification) => {
    if (notification.document_id) {
      return { path: "/employee/documents", state: { documentId: notification.document_id } };
    }

    if (["ACCOUNT_UPDATED", "ACCOUNT_SECURITY"].includes(notification.type)) {
      return { path: "/employee/profile" };
    }

    return { path: "/employee" };
  };

  const handleOpenNotification = async (notification) => {
    if (!notification.is_read) await handleMarkAsRead(notification.id);
    const destination = getNotificationDestination(notification);
    navigate(destination.path, { state: destination.state });
  };

  const getActionLabel = (notification) => {
    if (notification.document_id) {
      return notification.type === "DOCUMENT_REJECTED" || notification.type === "DOCUMENT_REQUIRED"
        ? "Take action"
        : "View document";
    }
    return ["ACCOUNT_UPDATED", "ACCOUNT_SECURITY"].includes(notification.type) ? "Open settings" : "View dashboard";
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const lowerSearch = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !lowerSearch ||
        `${getNotificationTitle(notification)} ${getNotificationMessage(notification)}`.toLowerCase().includes(lowerSearch);
      const matchesType =
        typeFilter === "ALL" || notification.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [notifications, searchTerm, typeFilter]);

  const groupedNotifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };

    filteredNotifications.forEach((notification) => {
      const createdAt = new Date(notification.created_at);
      const createdDay = new Date(createdAt);
      createdDay.setHours(0, 0, 0, 0);

      if (createdDay.getTime() === today.getTime()) {
        groups.Today.push(notification);
      } else if (createdDay.getTime() === yesterday.getTime()) {
        groups.Yesterday.push(notification);
      } else {
        groups.Earlier.push(notification);
      }
    });

    return Object.entries(groups).filter(([, items]) => items.length > 0);
  }, [filteredNotifications]);

  if (loading) {
    return <div className="empty-state">Loading your inbox...</div>;
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Notifications</p>
          <h1>Your inbox</h1>
          <p className="page-subtitle">Keep track of approvals, rejections, and document requests in one place.</p>
        </div>
        <button className="secondary-btn" onClick={() => navigate("/employee")}>Back to dashboard</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="notification-toolbar">
        <div className="crm-field">
          <label htmlFor="employee-notification-search">Search</label>
          <input
            id="employee-notification-search"
            type="text"
            placeholder="Search notifications"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="crm-field">
          <label htmlFor="employee-notification-filter">Filter type</label>
          <select
            id="employee-notification-filter"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            {notificationTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <button className="primary-btn" type="button" onClick={handleMarkAllRead}>
          Mark all read
        </button>
      </div>

      {groupedNotifications.length === 0 ? (
        <div className="empty-state">No notifications found.</div>
      ) : (
        groupedNotifications.map(([sectionTitle, sectionNotifications]) => (
          <section className="notification-section" key={sectionTitle}>
            <div className="notification-section__header">
              <h2>{sectionTitle}</h2>
              <span>{sectionNotifications.length} {sectionNotifications.length === 1 ? "item" : "items"}</span>
            </div>

            <div className="notification-list">
              {sectionNotifications.map((notification) => (
                <div
                  className={`notification-card ${notification.is_read ? "" : "unread"}`}
                  key={notification.id}
                >
                  <div
                    className="notification-card__content"
                    onClick={() => handleOpenNotification(notification)}
                  >
                    <div className="notification-card__icon">
                      {notificationIcons[notification.type] || "🔔"}
                    </div>
                    <div>
                      <div className="notification-card__title-row">
                        <h3>{getNotificationTitle(notification)}</h3>
                        {!notification.is_read && <span className="unread-dot" />}
                      </div>
                      <p>{getNotificationMessage(notification)}</p>
                      <div className="notification-meta">
                        <span>{notification.type?.replace(/_/g, " ") || "Update"}</span>
                        <span>•</span>
                        <span>{notification.created_at ? new Date(notification.created_at).toLocaleString() : "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="notification-card__actions">
                    {!notification.is_read ? (
                      <button
                        className="secondary-btn"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                      >
                        Mark as read
                      </button>
                    ) : (
                      <span className="status-badge approved">Read</span>
                    )}

                    <button
                      className="secondary-btn"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenNotification(notification);
                      }}
                    >
                      {getActionLabel(notification)}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

export default Notifications;
