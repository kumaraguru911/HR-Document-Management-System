import { useEffect, useState } from "react";
import api from "../api/api";

function PendingDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPendingDocuments = async () => {
      try {
        const response = await api.get("/documents/pending");
        setDocuments(response.data);
      } catch (err) {
        console.error("Failed to fetch pending documents:", err);
        const detail = err.response?.data?.detail;
        setError(typeof detail === "string" ? detail : "Failed to load pending documents.");
      } finally {
        setLoading(false);
      }
    };

    fetchPendingDocuments();
  }, []);

  if (loading) {
    return <div className="empty-state">Loading pending documents...</div>;
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Review queue</p>
          <h1>Pending document review</h1>
          <p className="page-subtitle">Track employee submissions and review outstanding items before they become delayed.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {documents.length === 0 ? (
        <div className="empty-state">No pending documents right now.</div>
      ) : (
        <div className="notification-list">
          {documents.map((doc) => (
            <div className="notification-card" key={doc.id}>
              <div>
                <h3>{doc.document_type_name}</h3>
                <p>{doc.original_filename}</p>
                <div className="notification-meta">
                  <span>{doc.employee_name}</span>
                  <span>•</span>
                  <span>{doc.employee_code}</span>
                  <span>•</span>
                  <span>{new Date(doc.uploaded_at).toLocaleString()}</span>
                </div>
              </div>
              <span className="status-badge pending">{doc.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PendingDocuments;