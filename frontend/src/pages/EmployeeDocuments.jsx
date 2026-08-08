import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../api/api";
import { FilePicker } from "../components/ui";

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
  const location = useLocation();
  const [checklistItems, setChecklistItems] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [expandedDocumentId, setExpandedDocumentId] = useState(null);
  const [expandedHistory, setExpandedHistory] = useState({});
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadDocumentTypeId, setUploadDocumentTypeId] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
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

  useEffect(() => {
    const notificationDocumentId = location.state?.documentId;
    if (!notificationDocumentId || submissions.length === 0) return;

    const targetSubmission = submissions.find((submission) => String(submission.id) === String(notificationDocumentId));
    if (!targetSubmission) return;

    const targetTypeId = targetSubmission.document_type_id;
    setExpandedDocumentId(targetTypeId);
    window.requestAnimationFrame(() => {
      document.getElementById(`employee-document-${targetTypeId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [location.state?.documentId, submissions]);

  useEffect(() => () => {
    if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
  }, [uploadPreviewUrl]);

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
  const uploadableDocuments = documentCards.filter((item) => item.displayStatus === "Not uploaded" || item.displayStatus === "Rejected");

  const closeUpload = () => {
    setIsUploadOpen(false);
    setUploadDocumentTypeId("");
    setUploadFile(null);
    setUploadPreviewUrl("");
    setUploadProgress(0);
    setUploadError("");
    setUploadSuccess(false);
  };

  const openUpload = (documentTypeId = "") => {
    setUploadDocumentTypeId(documentTypeId ? String(documentTypeId) : "");
    setUploadFile(null);
    setUploadPreviewUrl("");
    setUploadProgress(0);
    setUploadError("");
    setUploadSuccess(false);
    setIsUploadOpen(true);
  };

  const handleUploadFileChange = (file) => {
    setUploadError("");
    setUploadSuccess(false);
    setUploadProgress(0);

    if (!file) {
      setUploadFile(null);
      setUploadPreviewUrl("");
      return;
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      setUploadFile(null);
      setUploadPreviewUrl("");
      setUploadError("Unsupported file format. Choose a PDF, JPEG, or PNG file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadFile(null);
      setUploadPreviewUrl("");
      setUploadError("This file is too large. Files must be 5 MB or smaller.");
      return;
    }

    setUploadFile(file);
    setUploadPreviewUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : "");
  };

  const handleUpload = async () => {
    const documentTypeId = Number(uploadDocumentTypeId);
    if (!documentTypeId) {
      setUploadError("Select the required document you want to upload.");
      return;
    }
    if (!uploadFile) {
      setUploadError("Choose a PDF, JPEG, or PNG file before uploading.");
      return;
    }

    try {
      setUploadError("");
      setMessage("");
      setUploadingId(documentTypeId);
      setUploadProgress(1);
      const formData = new FormData();
      formData.append("file", uploadFile);
      await api.post(`/documents/my/upload/${documentTypeId}`, formData, {
        onUploadProgress: (event) => {
          if (event.total) setUploadProgress(Math.round((event.loaded / event.total) * 100));
        },
      });
      setUploadProgress(100);
      await fetchDocumentData();
      setUploadSuccess(true);
      setMessage(`${uploadFile.name} was uploaded successfully and is awaiting HR review.`);
    } catch (err) {
      console.error("Upload error:", err);
      const detail = err.response?.data?.detail;
      setUploadError(typeof detail === "string" ? detail : "Unable to upload document. Please try again.");
      setUploadProgress(0);
    } finally {
      setUploadingId(null);
    }
  };

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
        <button className="primary-btn" type="button" onClick={() => openUpload()} disabled={uploadableDocuments.length === 0}>
          Upload document
        </button>
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
                          <p className="helper-text">You’ll be able to check your file before submitting it.</p>
                          <button className="primary-btn" type="button" onClick={() => openUpload(document.document_type_id)}>
                            {document.displayStatus === "Rejected" ? "Upload replacement" : "Start upload"}
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

      {isUploadOpen && (
        <div className="profile-overlay upload-overlay" onClick={closeUpload}>
          <section className="upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-document-title" onClick={(event) => event.stopPropagation()}>
            <div className="panel-head">
              <div>
                <p className="eyebrow">Upload document</p>
                <h3 id="upload-document-title">Submit a required document</h3>
                <p className="panel-subtitle">Choose the document type, check your file, and submit it to HR.</p>
              </div>
              <button className="ghost-btn" type="button" onClick={closeUpload}>Close</button>
            </div>

            {uploadSuccess ? (
              <div className="upload-success-state">
                <span className="upload-success-state__icon">✓</span>
                <h4>Upload complete</h4>
                <p>Your document has been sent to HR for review.</p>
                <button className="primary-btn" type="button" onClick={closeUpload}>Done</button>
              </div>
            ) : (
              <div className="upload-workflow">
                <div className="upload-step">
                  <span>1</span>
                  <div>
                    <label htmlFor="upload-document-type">Select document type</label>
                    <select id="upload-document-type" value={uploadDocumentTypeId} onChange={(event) => { setUploadDocumentTypeId(event.target.value); setUploadError(""); }} disabled={uploadingId !== null}>
                      <option value="">Choose a required document</option>
                      {uploadableDocuments.map((document) => <option key={document.document_type_id} value={document.document_type_id}>{document.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="upload-step">
                  <span>2</span>
                  <div>
                    <FilePicker file={uploadFile} onChange={handleUploadFileChange} disabled={uploadingId !== null} />
                  </div>
                </div>

                {uploadFile && (
                  <div className="upload-preview">
                    {uploadPreviewUrl ? <img src={uploadPreviewUrl} alt={`Preview of ${uploadFile.name}`} /> : <span className="upload-preview__file-icon">PDF</span>}
                    <div>
                      <strong>{uploadFile.name}</strong>
                      <p>{formatFileSize(uploadFile.size)} · {uploadFile.type === "application/pdf" ? "PDF document" : "Image file"}</p>
                      <span>Ready to upload</span>
                    </div>
                  </div>
                )}

                {uploadError && <div className="alert alert-error" role="alert">{uploadError}</div>}
                {uploadingId !== null && <div className="upload-progress" aria-label={`Uploading ${uploadProgress}%`}><div><span>Uploading your file</span><strong>{uploadProgress}%</strong></div><i><b style={{ width: `${uploadProgress}%` }} /></i></div>}

                <div className="upload-workflow__actions">
                  <button className="secondary-btn" type="button" onClick={closeUpload} disabled={uploadingId !== null}>Cancel</button>
                  <button className="primary-btn" type="button" onClick={handleUpload} disabled={uploadingId !== null || !uploadFile || !uploadDocumentTypeId}>
                    {uploadingId !== null ? "Uploading…" : "Upload document"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default EmployeeDocuments;
