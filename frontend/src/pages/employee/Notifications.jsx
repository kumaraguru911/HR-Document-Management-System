import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";

function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
                  <span>{notification.created_at ? new Date(notification.created_at).toLocaleString() : "-"}</span>
                </div>
              </div>

              {!notification.is_read ? (
                <button className="secondary-btn" onClick={() => handleMarkAsRead(notification.id)}>
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

export default Notifications;