import { useEffect, useState } from "react";
import api from "../../api/api";

const actionOptions = [
  { value: "ALL", label: "All actions" },
  { value: "DOCUMENT_UPLOADED", label: "Document uploaded" },
  { value: "DOCUMENT_APPROVED", label: "Document approved" },
  { value: "DOCUMENT_REJECTED", label: "Document rejected" }
];

const actionLabel = (action) => {
  switch (action) {
    case "DOCUMENT_UPLOADED":
      return "uploaded";
    case "DOCUMENT_APPROVED":
      return "approved";
    case "DOCUMENT_REJECTED":
      return "rejected";
    default:
      return action;
  }
};

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchAuditLogs = async (params = {}) => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/audit", {
        params: {
          ...params,
          action: params.action,
          start_date: params.start_date,
          end_date: params.end_date,
          search: params.search
        }
      });

      setLogs(response.data || []);
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Unable to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs({
      action: actionFilter === "ALL" ? undefined : actionFilter,
      start_date: startDate || undefined,
      end_date: endDate || undefined
    });
  }, [actionFilter, startDate, endDate]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    fetchAuditLogs({
      action: actionFilter === "ALL" ? undefined : actionFilter,
      search: search.trim() || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined
    });
  };

  const handleReset = () => {
    setSearch("");
    setActionFilter("ALL");
    setStartDate("");
    setEndDate("");
    fetchAuditLogs({});
  };

  const renderLogMessage = (log) => {
    const actor = log.user_name || log.user_email || "Unknown user";
    const documentText = log.document_name ? `document "${log.document_name}"` : "a document";
    const employeeText = log.employee_name
      ? `for ${log.employee_name} (${log.employee_code || "no code"})`
      : log.employee_code
      ? `for ${log.employee_code}`
      : "";

    return `${actor} ${actionLabel(log.action)} ${documentText}${employeeText ? ` ${employeeText}` : ""}.`;
  };

  return (
    <div className="panel-card">
      <div className="panel-head">
        <div>
          <h1>Audit Logs</h1>
          <p className="panel-subtitle">Activity feed for HR actions with search and filters.</p>
        </div>
      </div>

      <form className="notification-toolbar" onSubmit={handleSearchSubmit}>
        <input
          type="text"
          placeholder="Search by user, document, employee, or details"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
          {actionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className="filter-group" style={{ display: "grid", gap: "10px" }}>
          <label>
            <span>From</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              aria-label="Start date"
            />
          </label>
          <label>
            <span>To</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              aria-label="End date"
            />
          </label>
        </div>

        <button type="submit" className="ghost-btn">
          Apply filters
        </button>
        <button type="button" className="ghost-btn" onClick={handleReset}>
          Reset
        </button>
      </form>

      {loading ? (
        <p>Loading activity...</p>
      ) : error ? (
        <p>{error}</p>
      ) : logs.length === 0 ? (
        <p className="empty-state">No audit activity found for the selected filters.</p>
      ) : (
        <div className="activity-list">
          {logs.map((log) => (
            <article key={log.id} className="activity-item">
              <span className="activity-dot" />
              <div>
                <strong>{renderLogMessage(log)}</strong>
                {log.details && <p>{log.details}</p>}
                <p className="notification-meta">
                  {new Date(log.created_at).toLocaleString()}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default AuditLogs;
