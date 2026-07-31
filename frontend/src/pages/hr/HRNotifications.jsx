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

      setError(
        err.response?.data?.detail ||
        "Failed to load notifications"
      );
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

      await api.patch(
        `/notifications/${notificationId}/read`
      );

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                is_read: true,
              }
            : notification
        )
      );
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
        "Failed to mark notification as read"
      );
    }
  };

  if (loading) {
    return (
      <div>
        <h1>HR Notifications</h1>
        <p>Loading notifications...</p>
      </div>
    );
  }

  return (
    <div>
      <h1>HR Notifications</h1>

      {error && <p>{error}</p>}

      {notifications.length === 0 ? (
        <p>No notifications.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Message</th>
              <th>Type</th>
              <th>Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {notifications.map((notification) => (
              <tr key={notification.id}>
                <td>{notification.title}</td>

                <td>{notification.message}</td>

                <td>{notification.type}</td>

                <td>
                  {new Date(
                    notification.created_at
                  ).toLocaleString()}
                </td>

                <td>
                  {notification.is_read
                    ? "READ"
                    : "UNREAD"}
                </td>

                <td>
                  {!notification.is_read ? (
                    <button
                      onClick={() =>
                        handleMarkRead(notification.id)
                      }
                    >
                      Mark as Read
                    </button>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default HRNotifications;