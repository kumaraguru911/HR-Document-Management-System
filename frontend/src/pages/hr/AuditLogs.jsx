import { useEffect, useState } from "react";
import api from "../../api/api";
import { EmptyState, FilterPanel, PageHeader, Timeline } from "../../components/ui";

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
    <div className="page-shell">
      <PageHeader eyebrow="Activity tracking" title="Audit logs" description="Review the complete activity history of HR actions with advanced search and filtering options." />

      {error && <div className="alert alert-error">{error}</div>}

      <section className="panel-card">
        <div className="panel-head">
          <div>
            <h3>Activity history</h3>
            <p className="panel-subtitle">Search, filter, and track all HR system activities.</p>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit}><FilterPanel actions={<><button type="submit" className="primary-btn">Apply filters</button><button type="button" className="ghost-btn" onClick={handleReset}>Reset</button></>}>
          <div className="crm-field">
            <label htmlFor="audit-search">Search logs</label>
            <input
              id="audit-search"
              type="text"
              placeholder="Search by user, document, employee, or details"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="crm-field">
            <label htmlFor="audit-action">Action type</label>
            <select id="audit-action" value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
              {actionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="crm-field">
            <label htmlFor="audit-start">From date</label>
            <input
              id="audit-start"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              aria-label="Start date"
            />
          </div>

          <div className="crm-field">
            <label htmlFor="audit-end">To date</label>
            <input
              id="audit-end"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              aria-label="End date"
            />
          </div>

        </FilterPanel></form>

        {loading ? (
          <p className="helper-text">Loading activity logs...</p>
        ) : error ? (
          <p className="error-text">{error}</p>
        ) : logs.length === 0 ? (
          <EmptyState title="No audit activity found" description="Try broadening the selected filters." />
        ) : (
          <Timeline items={logs.map((log) => ({ id: log.id, title: renderLogMessage(log), description: log.details, meta: new Date(log.created_at).toLocaleString() }))} />
        )}
      </section>
    </div>
  );
}

export default AuditLogs;
