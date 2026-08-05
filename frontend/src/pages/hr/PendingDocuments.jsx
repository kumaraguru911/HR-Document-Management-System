import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";

function PendingDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejectReasons, setRejectReasons] = useState({});
  const [processingId, setProcessingId] = useState(null);
  const navigate = useNavigate();

  const fetchPendingDocuments = async () => {
    try {
      setError("");
      const response = await api.get("/documents/pending");
      setDocuments(response.data);
    } catch (err) {
      console.error("Failed to fetch pending documents:", err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Unable to load pending documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingDocuments();
  }, []);

  const handleView = (document) => {
    navigate(`/hr/documents/${document.id}`, { state: { document } });
  };

  const handleApprove = async (documentId) => {
    try {
      setError("");
      setProcessingId(documentId);
      await api.post(`/documents/${documentId}/approve`);
      await fetchPendingDocuments();
    } catch (err) {
      console.error("Approve error:", err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Unable to approve document.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (documentId) => {
    const reason = rejectReasons[documentId]?.trim();

    if (!reason) {
      setError("Please enter a rejection reason.");
      return;
    }

    try {
      setError("");
      setProcessingId(documentId);
      await api.post(`/documents/${documentId}/reject`, { reason });
      setRejectReasons((prev) => ({ ...prev, [documentId]: "" }));
      await fetchPendingDocuments();
    } catch (err) {
      console.error("Reject error:", err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Unable to reject document.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <div className="empty-state">Loading review queue...</div>;
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Review queue</p>
          <h1>Pending document review</h1>
          <p className="page-subtitle">Review employee submissions, inspect files, and approve or reject them with clear context.</p>
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

              <div className="stack">
                <div className="doc-meta">
                  <span className={`status-badge ${doc.status?.toLowerCase() || "pending"}`}>{doc.status}</span>
                  <span>{doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : "-"}</span>
                </div>
                <div className="upload-box">
                  <button className="secondary-btn" type="button" onClick={() => handleView(doc)}>
                    View
                  </button>
                  <button className="primary-btn" type="button" disabled={processingId === doc.id} onClick={() => handleApprove(doc.id)}>
                    {processingId === doc.id ? "Processing..." : "Approve"}
                  </button>
                </div>
                <div className="upload-box">
                  <label style={{ display: "block", width: "100%" }}>
                    <span className="helper-text">Rejection reason</span>
                    <textarea
                      className="field"
                      rows={2}
                      placeholder="Enter rejection reason (required)"
                      value={rejectReasons[doc.id] || ""}
                      onChange={(e) => setRejectReasons((prev) => ({ ...prev, [doc.id]: e.target.value }))}
                      style={{ resize: "vertical", minHeight: 40 }}
                    />
                  </label>
                  <button className="secondary-btn" type="button" disabled={processingId === doc.id} onClick={() => handleReject(doc.id)}>
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PendingDocuments;