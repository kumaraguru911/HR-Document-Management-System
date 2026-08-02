import { useEffect, useState } from "react";
import api from "../api/api";

function EmployeeDocuments() {
  const [documents, setDocuments] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchChecklist = async () => {
    try {
      setError("");
      const response = await api.get("/documents/my/checklist");
      setDocuments(response.data);
    } catch (err) {
      console.error("Checklist error:", err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Unable to load document checklist.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklist();
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

      await fetchChecklist();
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

  const getStatusClass = (status) => {
    if (!status) return "pending";
    return status.toLowerCase();
  };

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

      {documents.length === 0 ? (
        <div className="empty-state">No document requirements were found for your profile.</div>
      ) : (
        <div className="card-grid">
          {documents.map((document) => (
            <article className="panel-card doc-card" key={document.document_type_id}>
              <div className="panel-head">
                <div>
                  <h3>{document.name}</h3>
                  <p className="helper-text">{document.description || "No description provided."}</p>
                </div>
                <span className={`status-badge ${getStatusClass(document.status)}`}>
                  {document.status || "PENDING"}
                </span>
              </div>

              <div className="doc-meta">
                <span>Required: {document.required ? "Yes" : "No"}</span>
                <span>{document.status === "APPROVED" ? "Completed" : "Awaiting review"}</span>
              </div>

              {document.status === "APPROVED" ? (
                <div className="empty-state">This document has already been approved.</div>
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
                      : document.status === "REJECTED"
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