import { useEffect, useState } from "react";
import api from "../../api/api";

function HRNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/notifications/my");
      setNotifications(response.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkRead = async (notificationId) => {
    try {
      setError("");
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId ? { ...notification, is_read: true } : notification
        )
      );
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to mark notification as read");
    }
  };

  if (loading) {
    return <div className="empty-state">Loading notifications...</div>;
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Notifications</p>
          <h1>Team updates</h1>
          <p className="page-subtitle">Monitor new submissions and document outcomes from a single inbox.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {notifications.length === 0 ? (
        <div className="empty-state">No notifications yet.</div>
      ) : (
        <div className="notification-list">
          {notifications.map((notification) => (
            <div className={`notification-card ${notification.is_read ? "" : "unread"}`} key={notification.id}>
              <div>
                <h3>{notification.title}</h3>
                <p>{notification.message}</p>
                <div className="notification-meta">
                  <span>{notification.type?.replace(/_/g, " ") || "Update"}</span>
                  <span>•</span>
                  <span>{new Date(notification.created_at).toLocaleString()}</span>
                </div>
              </div>

              {!notification.is_read ? (
                <button className="secondary-btn" onClick={() => handleMarkRead(notification.id)}>
                  Mark as read
                </button>
              ) : (
                <span className="status-badge approved">Read</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HRNotifications;