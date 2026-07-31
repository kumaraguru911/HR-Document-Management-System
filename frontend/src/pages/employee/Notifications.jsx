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

      console.log("Notifications:", response.data);

      setNotifications(response.data);
    } catch (err) {
      console.error("Notification fetch error:", err);

      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Unable to load notifications."
      );
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

      await api.patch(
        `/notifications/${notificationId}/read`
      );

      // Update locally instead of fetching everything again
      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                is_read: true,
              }
            : notification
        )
      );
    } catch (err) {
      console.error("Mark as read error:", err);

      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Unable to mark notification as read."
      );
    }
  };

  if (loading) {
    return (
      <div>
        <h1>Notifications</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Notifications</h1>

      <button onClick={() => navigate("/employee")}>
        Back to Dashboard
      </button>

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
                <td>
                  {notification.title}
                </td>

                <td>
                  {notification.message}
                </td>

                <td>
                  {notification.type}
                </td>

                <td>
                  {notification.created_at
                    ? new Date(
                        notification.created_at
                      ).toLocaleString()
                    : "-"}
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
                        handleMarkAsRead(notification.id)
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

export default Notifications;