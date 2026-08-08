import { useEffect, useMemo, useState } from "react";
import api from "../api/api";

function EmployeeDocuments() {
  const [checklistItems, setChecklistItems] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchDocumentData = async () => {
    try {
      setError("");
      const [checklistResponse, submissionsResponse] = await Promise.all([
        api.get("/documents/my/checklist"),
        api.get("/documents/my/submissions"),
      ]);

      setChecklistItems(checklistResponse.data || []);
      setSubmissions(submissionsResponse.data || []);
    } catch (err) {
      console.error("Document data error:", err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Unable to load document checklist.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentData();
  }, []);

  const handleFileChange = (documentTypeId, file) => {
    setSelectedFiles((previous) => ({
      ...previous,
      [documentTypeId]: file,
    }));
  };

  const handleUpload = async (documentTypeId) => {
    const file = selectedFiles[documentTypeId];

    if (!file) {
      setError("Please select a file first.");
      return;
    }

    try {
      setError("");
      setMessage("");
      setUploadingId(documentTypeId);

      const formData = new FormData();
      formData.append("file", file);

      await api.post(`/documents/my/upload/${documentTypeId}`, formData);

      await fetchDocumentData();
      setSelectedFiles((prev) => ({
        ...prev,
        [documentTypeId]: null,
      }));
      setMessage(`${file.name} was uploaded successfully.`);
    } catch (err) {
      console.error("Upload error:", err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Unable to upload document.");
    } finally {
      setUploadingId(null);
    }
  };

  const getDisplayStatus = (status) => {
    if (!status) return "Pending";

    const normalized = String(status).toUpperCase();
    if (normalized === "APPROVED") return "Approved";
    if (normalized === "REJECTED") return "Rejected";
    if (normalized === "PENDING") return "Pending";
    if (normalized === "MISSING") return "Pending";
    if (normalized === "UPLOADED" || normalized === "SUBMITTED" || normalized === "IN_REVIEW" || normalized === "UNDER_REVIEW") {
      return "Uploaded";
    }

    return "Pending";
  };

  const getStatusClass = (status) => {
    const displayStatus = getDisplayStatus(status).toLowerCase();
    return displayStatus === "uploaded" ? "uploaded" : displayStatus;
  };

  const documentCards = useMemo(() => {
    return checklistItems.map((item) => {
      const history = submissions
        .filter((submission) => submission.document_type_id === item.document_type_id)
        .sort((left, right) => new Date(right.uploaded_at || 0) - new Date(left.uploaded_at || 0));

      const latestSubmission = history[0];
      const displayStatus = getDisplayStatus(latestSubmission?.status ?? item.status);
      const needsAttention = displayStatus === "Pending" || displayStatus === "Rejected";
      const feedback = latestSubmission?.status === "REJECTED"
        ? latestSubmission?.rejection_reason || "HR requested changes to this submission."
        : latestSubmission?.status === "APPROVED"
          ? "Approved by HR and ready for onboarding."
          : displayStatus === "Uploaded"
            ? "Awaiting HR review."
            : "Awaiting your upload.";

      return {
        ...item,
        displayStatus,
        needsAttention,
        feedback,
        history,
      };
    });
  }, [checklistItems, submissions]);

  if (loading) {
    return <div className="empty-state">Loading your document checklist...</div>;
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">My documents</p>
          <h1>Checklist and submissions</h1>
          <p className="page-subtitle">Upload the documents required for your onboarding and monitor review progress.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      {documentCards.length === 0 ? (
        <div className="empty-state">No document requirements were found for your profile.</div>
      ) : (
        <div className="card-grid">
          {documentCards.map((document) => (
            <article className={`panel-card doc-card ${document.needsAttention ? "doc-card--attention" : ""}`} key={document.document_type_id}>
              <div className="panel-head">
                <div>
                  <h3>{document.name}</h3>
                  <p className="helper-text">{document.description || "No description provided."}</p>
                </div>
                <span className={`status-badge ${getStatusClass(document.displayStatus)}`}>
                  {document.displayStatus}
                </span>
              </div>

              <div className="doc-meta">
                <span>{document.required ? "Required for onboarding" : "Optional document"}</span>
                <span>{document.needsAttention ? "Needs attention" : "On track"}</span>
              </div>

              <div className="doc-detail-row">
                <span className="doc-detail-label">Deadline</span>
                <span className="doc-detail-value">{document.required ? "No formal deadline set" : "Not required"}</span>
              </div>

              <div className="doc-detail-row">
                <span className="doc-detail-label">HR feedback</span>
                <span className="doc-detail-value">{document.feedback}</span>
              </div>

              <div className="doc-history">
                <div className="doc-history__title">Upload history</div>
                {document.history.length === 0 ? (
                  <p className="doc-history__empty">No uploads yet. Use the uploader below to get started.</p>
                ) : (
                  <ul>
                    {document.history.slice(0, 3).map((item) => (
                      <li key={item.id}>
                        <strong>{item.original_filename}</strong>
                        <span>{new Date(item.uploaded_at).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {document.displayStatus === "Approved" ? (
                <div className="doc-action-note">This document has already been approved and is ready for onboarding.</div>
              ) : (
                <div className="upload-box">
                  <label className="file-picker">
                    <span>{selectedFiles[document.document_type_id]?.name || "Choose file"}</span>
                    <input
                      type="file"
                      onChange={(e) => handleFileChange(document.document_type_id, e.target.files[0])}
                    />
                  </label>
                  <button
                    className="primary-btn"
                    type="button"
                    disabled={uploadingId === document.document_type_id}
                    onClick={() => handleUpload(document.document_type_id)}
                  >
                    {uploadingId === document.document_type_id
                      ? "Uploading..."
                      : document.displayStatus === "Rejected"
                        ? "Re-upload"
                        : "Upload document"}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default EmployeeDocuments;