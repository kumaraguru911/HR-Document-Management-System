import { useEffect, useMemo, useState } from "react";
import api from "../api/api";

const MAX_HISTORY_ITEMS = 3;

function formatDate(value, includeTime = false) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString([], includeTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" });
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 1) return "";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function EmployeeDocuments() {
  const [checklistItems, setChecklistItems] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [expandedDocumentId, setExpandedDocumentId] = useState(null);
  const [expandedHistory, setExpandedHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
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
    setSelectedFiles((previous) => ({ ...previous, [documentTypeId]: file || null }));
  };

  const handleUpload = async (documentTypeId) => {
    const file = selectedFiles[documentTypeId];
    if (!file) {
      setError("Choose a PDF, JPEG, or PNG file before uploading.");
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
      setSelectedFiles((previous) => ({ ...previous, [documentTypeId]: null }));
      setMessage(`${file.name} was uploaded successfully and is awaiting HR review.`);
    } catch (err) {
      console.error("Upload error:", err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Unable to upload document.");
    } finally {
      setUploadingId(null);
    }
  };

  const handleDownload = async (submission) => {
    try {
      setError("");
      setDownloadingId(submission.id);
      const response = await api.get(`/documents/${submission.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = submission.original_filename || "document";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Unable to download this version.");
    } finally {
      setDownloadingId(null);
    }
  };

  const getDisplayStatus = (status) => {
    const normalized = String(status || "MISSING").toUpperCase();
    if (normalized === "APPROVED") return "Approved";
    if (normalized === "REJECTED") return "Rejected";
    if (["PENDING", "UPLOADED", "SUBMITTED", "IN_REVIEW", "UNDER_REVIEW"].includes(normalized)) return "In review";
    return "Not uploaded";
  };

  const getStatusClass = (displayStatus) => ({
    "Approved": "approved",
    "Rejected": "rejected",
    "In review": "uploaded",
    "Not uploaded": "pending",
  }[displayStatus]);

  const documentCards = useMemo(() => checklistItems.map((item) => {
    const history = submissions
      .filter((submission) => submission.document_type_id === item.document_type_id)
      .sort((left, right) => new Date(right.uploaded_at || 0) - new Date(left.uploaded_at || 0));
    const latestSubmission = history[0];
    const displayStatus = getDisplayStatus(latestSubmission?.status ?? item.status);
    const needsAttention = displayStatus === "Not uploaded" || displayStatus === "Rejected";
    const feedback = displayStatus === "Rejected"
      ? latestSubmission?.rejection_reason || "HR requested changes to this submission."
      : displayStatus === "Approved"
        ? "Approved by HR. No further action is needed."
        : displayStatus === "In review"
          ? "Your latest upload is waiting for HR review."
          : "Upload a file to complete this requirement.";

    return { ...item, history, latestSubmission, displayStatus, needsAttention, feedback };
  }), [checklistItems, submissions]);

  const summary = useMemo(() => ({
    total: documentCards.length,
    attention: documentCards.filter((item) => item.needsAttention).length,
    inReview: documentCards.filter((item) => item.displayStatus === "In review").length,
    approved: documentCards.filter((item) => item.displayStatus === "Approved").length,
  }), [documentCards]);

  const attentionDocuments = documentCards.filter((item) => item.needsAttention);

  const toggleDocument = (documentTypeId) => {
    setExpandedDocumentId((current) => current === documentTypeId ? null : documentTypeId);
  };

  const openDocumentFromTask = (documentTypeId) => {
    setExpandedDocumentId(documentTypeId);
    window.requestAnimationFrame(() => {
      document.getElementById(`employee-document-${documentTypeId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  };

  if (loading) return <div className="empty-state">Loading your document checklist...</div>;

  return (
    <div className="page-shell employee-documents-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">My documents</p>
          <h1>Document checklist</h1>
          <p className="page-subtitle">Complete your required uploads and check the latest feedback from HR.</p>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {message && <div className="alert alert-success" role="status">{message}</div>}

      {documentCards.length === 0 ? (
        <div className="empty-state">No required documents were found for your profile.</div>
      ) : (
        <div className="content-grid onboarding-lower employee-documents-layout">
          <section className="panel-card panel-card--wide">
            <div className="panel-head">
              <div>
                <h3>Required documents</h3>
                <p className="panel-subtitle">Select a document to upload a file, view prior versions, or read HR feedback.</p>
              </div>
              <span className="pill-chip">{summary.total} required</span>
            </div>

            <div className="document-list employee-document-list">
            {documentCards.map((document) => {
              const isDocumentExpanded = expandedDocumentId === document.document_type_id;
              const isHistoryExpanded = expandedHistory[document.document_type_id];
              const visibleHistory = isHistoryExpanded ? document.history : document.history.slice(0, MAX_HISTORY_ITEMS);
              return (
                <article id={`employee-document-${document.document_type_id}`} className={`employee-document-row ${document.needsAttention ? "employee-document-row--attention" : ""} ${isDocumentExpanded ? "is-expanded" : ""}`} key={document.document_type_id}>
                  <div className="employee-document-row__summary">
                    <div>
                      <h4>{document.name}</h4>
                      <p>{document.description || "Upload a clear, valid copy for HR verification."}</p>
                    </div>
                    <div className="employee-document-row__actions">
                      <span className={`status-badge ${getStatusClass(document.displayStatus)}`}>{document.displayStatus}</span>
                      <button className="secondary-btn" type="button" onClick={() => toggleDocument(document.document_type_id)}>
                        {isDocumentExpanded ? "Close" : document.needsAttention ? "Take action" : "View details"}
                      </button>
                    </div>
                  </div>

                  {isDocumentExpanded && (
                    <div className="employee-document-row__details">
                      <div className="employee-document-info">
                        <div><span>Upload deadline</span><strong>No deadline set</strong></div>
                        <div><span>Latest upload</span><strong>{document.latestSubmission ? formatDate(document.latestSubmission.uploaded_at) : "Not uploaded"}</strong></div>
                      </div>

                      <div className={`doc-feedback ${document.displayStatus === "Rejected" ? "doc-feedback--rejected" : ""}`}>
                        <span>HR feedback</span>
                        <p>{document.feedback}</p>
                      </div>

                      <div className="doc-history">
                        <div className="doc-history__heading">
                          <span className="doc-history__title">Upload history</span>
                          <span>{document.history.length} version{document.history.length === 1 ? "" : "s"}</span>
                        </div>
                        {document.history.length === 0 ? (
                          <p className="doc-history__empty">No uploads yet.</p>
                        ) : (
                          <ul>
                            {visibleHistory.map((item, index) => (
                              <li key={item.id}>
                                <div className="doc-history__file">
                                  <strong>{item.original_filename}</strong>
                                  <span>{index === 0 ? "Latest version · " : "Previous version · "}{formatDate(item.uploaded_at, true)}{formatFileSize(item.file_size) ? ` · ${formatFileSize(item.file_size)}` : ""}</span>
                                </div>
                                <button className="text-btn" type="button" onClick={() => handleDownload(item)} disabled={downloadingId === item.id}>
                                  {downloadingId === item.id ? "Downloading…" : "Download"}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        {document.history.length > MAX_HISTORY_ITEMS && (
                          <button className="text-btn doc-history__toggle" type="button" onClick={() => setExpandedHistory((current) => ({ ...current, [document.document_type_id]: !isHistoryExpanded }))}>
                            {isHistoryExpanded ? "Show fewer versions" : `View all ${document.history.length} versions`}
                          </button>
                        )}
                      </div>

                      {document.displayStatus === "Approved" ? (
                        <div className="doc-action-note">This requirement is complete.</div>
                      ) : (
                        <div className="upload-box">
                      <label className="file-picker">
                        <span>{selectedFiles[document.document_type_id]?.name || "Choose PDF, JPEG, or PNG"}</span>
                        <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => handleFileChange(document.document_type_id, event.target.files?.[0])} />
                      </label>
                      <button className="primary-btn" type="button" disabled={uploadingId === document.document_type_id} onClick={() => handleUpload(document.document_type_id)}>
                        {uploadingId === document.document_type_id ? "Uploading…" : document.displayStatus === "Rejected" ? "Upload replacement" : "Upload document"}
                      </button>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
            </div>
          </section>

          <aside className="stack dashboard-side-stack">
            <section className="panel-card">
              <div className="panel-head">
                <div>
                  <h3>Next steps</h3>
                  <p className="panel-subtitle">Focus on the items that need you now.</p>
                </div>
              </div>
              {attentionDocuments.length === 0 ? (
                <div className="empty-state">Everything is submitted. We’ll let you know if HR needs anything else.</div>
              ) : (
                <div className="task-list">
                  {attentionDocuments.map((document) => (
                    <button className="employee-document-task" type="button" key={document.document_type_id} onClick={() => openDocumentFromTask(document.document_type_id)}>
                      <span className="task-icon" />
                      <span><strong>{document.name}</strong><small>{document.displayStatus === "Rejected" ? "Update and re-upload your document." : "Upload this required document."}</small></span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="panel-card">
              <div className="panel-head">
                <div>
                  <h3>Checklist progress</h3>
                  <p className="panel-subtitle">A quick view of your onboarding documents.</p>
                </div>
              </div>
              <div className="employee-document-progress">
                <div><span>Approved</span><strong>{summary.approved}</strong></div>
                <div><span>In review</span><strong>{summary.inReview}</strong></div>
                <div><span>Needs attention</span><strong>{summary.attention}</strong></div>
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

export default EmployeeDocuments;
