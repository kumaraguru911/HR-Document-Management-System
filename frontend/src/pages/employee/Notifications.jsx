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
};

function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const fetchNotificationAccessUrls = async (items) => {
    const results = await Promise.allSettled(
      items
        .filter((item) => item.document_id)
        .map(async (item) => {
          try {
            const response = await api.get(`/documents/${item.document_id}/access`);
            return {
              id: item.id,
              access_url: response.data.url,
            };
          } catch {
            return null;
          }
        })
    );

    const urls = results
      .filter((result) => result.status === "fulfilled" && result.value)
      .map((result) => result.value);

    setNotifications((current) =>
      current.map((notification) => {
        const found = urls.find((item) => item.id === notification.id);
        return found ? { ...notification, access_url: found.access_url } : notification;
      })
    );
  };

  const fetchNotifications = async () => {
    try {
      setError("");
      const response = await api.get("/notifications/my");
      setNotifications(response.data);
      fetchNotificationAccessUrls(response.data);
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

  const handleOpenNotification = async (notification) => {
    if (!notification.document_id) {
      return;
    }

    const url = notification.access_url;
    if (!url) {
      setError("Document link is not ready yet. Please try again in a moment.");
      return;
    }

    const absoluteUrl = url.match(/^https?:\/\//) ? url : `${window.location.protocol}//${window.location.host}${url}`;
    const newTab = window.open(absoluteUrl, "_blank", "noopener,noreferrer");

    if (!newTab) {
      setError("Unable to open new tab. Please allow popups for this site.");
      return;
    }

    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const lowerSearch = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !lowerSearch ||
        `${notification.title} ${notification.message}`.toLowerCase().includes(lowerSearch);
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
                        <h3>{notification.title}</h3>
                        {!notification.is_read && <span className="unread-dot" />}
                      </div>
                      <p>{notification.message}</p>
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

                    {notification.document_id && (
                      <button
                        className="secondary-btn"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenNotification(notification);
                        }}
                      >
                        Open documents
                      </button>
                    )}
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