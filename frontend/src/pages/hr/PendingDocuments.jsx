import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { EmptyState, PageHeader, StatusBadge } from "../../components/ui";

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
    return <EmptyState title="Loading review queue" />;
  }

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Review queue" title="Pending document review" description="Review employee submissions, inspect files, and approve or reject them with clear context." />

      {error && <div className="alert alert-error">{error}</div>}

      {documents.length === 0 ? (
        <EmptyState title="No pending documents" description="New submissions will appear here when they are ready for review." />
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
                  <StatusBadge status={doc.status || "Pending"} />
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
                <div className="upload-box reject-box">
                  <div className="reject-box__header">
                    <div>
                      <p className="helper-text">Rejection reason</p>
                      <p className="reject-box__description">Explain why this document cannot be approved.</p>
                    </div>
                    <span className="reject-box__tag">Required</span>
                  </div>
                  <textarea
                    className="field reject-box__textarea"
                    rows={3}
                    placeholder="Type a clear rejection reason..."
                    value={rejectReasons[doc.id] || ""}
                    onChange={(e) => setRejectReasons((prev) => ({ ...prev, [doc.id]: e.target.value }))}
                  />
                  <button className="secondary-btn reject-box__button" type="button" disabled={processingId === doc.id} onClick={() => handleReject(doc.id)}>
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
