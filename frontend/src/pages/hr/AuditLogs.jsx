import { useEffect, useState } from "react";
import api from "../../api/api";

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/audit");

      console.log("Audit logs:", response.data);

      setLogs(response.data);
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);

      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Unable to load audit logs."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  if (loading) {
    return (
      <div>
        <h1>Audit Logs</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Audit Logs</h1>

      {error && <p>{error}</p>}

      {logs.length === 0 ? (
        <p>No audit logs found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User ID</th>
              <th>Action</th>
              <th>Document ID</th>
              <th>Details</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.id}</td>

                <td>{log.user_id ?? "-"}</td>

                <td>{log.action}</td>

                <td>{log.document_id ?? "-"}</td>

                <td>{log.details || "-"}</td>

                <td>
                  {log.created_at
                    ? new Date(log.created_at).toLocaleString()
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AuditLogs;