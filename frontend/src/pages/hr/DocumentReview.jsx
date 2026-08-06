import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../../api/api";

function DocumentReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [doc, setDoc] = useState(location.state?.document || null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [accessInfo, setAccessInfo] = useState({ url: "", filename: "", status: null, error: null });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let active = true;
    let blobUrl = null;

    const fetch = async () => {
      setLoading(true);
      try {
        // Resolve metadata first from navigation state or pending list so we can show details
        let resolvedDoc = location.state?.document;

        if (!resolvedDoc) {
          try {
            const pendingRes = await api.get("/documents/pending");
            resolvedDoc = pendingRes.data.find((item) => String(item.id) === String(id));
          } catch (e) {
            // ignore — we'll still try to fetch access URL
            resolvedDoc = null;
          }
        }

        // Set a minimal doc so the UI can render metadata even if access fails
        const minimalDoc = resolvedDoc
          ? {
              ...resolvedDoc,
            }
          : null;

        setDoc(minimalDoc);

        // Try to preview via backend download first, then fall back to signed URL if needed
        blobUrl = null;
        try {
          const downloadRes = await api.get(`/documents/${id}/download`, {
            responseType: "blob"
          });

          blobUrl = URL.createObjectURL(downloadRes.data);
          setPreviewUrl(blobUrl);
          setAccessInfo({
            url: "",
            filename: downloadRes.headers["content-disposition"]?.split("filename=")[1]?.replace(/\"/g, "") || minimalDoc?.original_filename || "",
            status: downloadRes.status,
            error: null
          });
        } catch (downloadError) {
          console.warn("Backend download preview failed:", downloadError);

          try {
            const accessRes = await api.get(`/documents/${id}/access`);
            const url = accessRes.data.url || "";
            setPreviewUrl(url);
            setAccessInfo({ url, filename: accessRes.data.filename || "", status: accessRes.status, error: null });

            if (!minimalDoc) {
              setDoc({
                id: id,
                original_filename: accessRes.data.filename || "",
                content_type: accessRes.data.content_type || "",
                document_type_name: "Document",
                employee_name: "Employee",
                status: "PENDING",
                uploaded_at: new Date().toISOString(),
              });
            }
          } catch (accessError) {
            console.warn("Document access failed:", accessError);
            const status = accessError.response?.status || null;
            const detail = accessError.response?.data?.detail || accessError.message || "Access error";
            setAccessInfo({ url: "", filename: "", status, error: detail });
            setToast({ type: "error", text: "Unable to load file preview (access may be restricted)." });
          }
        }

        const histRes = await api.get(`/documents/${id}/history`).catch(() => ({ data: [] }));
        setHistory(histRes.data || []);
      } catch (err) {
        setToast({ type: "error", text: "Unable to load document." });
      } finally {
        setLoading(false);
      }
    };

    fetch();

    return () => {
      active = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [id, location.state]);

  const showToast = (t) => {
    setToast(t);
    setTimeout(() => setToast(null), 3500);
  };

  const handleApprove = async () => {
    if (!window.confirm("Approve this document? This action cannot be undone.")) return;
    setActionLoading(true);
    try {
      await api.post(`/documents/${id}/approve`);
      showToast({ type: "success", text: "Document approved." });
      navigate("/hr/documents");
    } catch (err) {
      showToast({ type: "error", text: "Failed to approve document." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showToast({ type: "error", text: "Please enter a rejection reason." });
      return;
    }

    if (!window.confirm("Reject this document and notify the employee?")) return;
    setActionLoading(true);
    try {
      await api.post(`/documents/${id}/reject`, { reason: rejectReason });
      showToast({ type: "success", text: "Document rejected and employee notified." });
      navigate("/hr/documents");
    } catch (err) {
      showToast({ type: "error", text: "Failed to reject document." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenFile = async () => {
    try {
      const newTab = window.open("about:blank", "_blank");
      if (!newTab) {
        showToast({ type: "error", text: "Unable to open new tab. Please allow popups for this site." });
        return;
      }

      const downloadRes = await api.get(`/documents/${id}/download`, {
        responseType: "blob"
      });

      const objectUrl = URL.createObjectURL(downloadRes.data);
      const filename = doc.original_filename || "Document";
      const pageHtml = `<!DOCTYPE html>
<html>
<head>
  <title>${filename}</title>
  <style>html,body{height:100%;margin:0;background:#fff}</style>
</head>
<body>
  <embed src="${objectUrl}" type="${downloadRes.data.type}" width="100%" height="100%" />
  <script>
    window.addEventListener('unload', () => {
      URL.revokeObjectURL('${objectUrl}');
    });
  </script>
</body>
</html>`;

      newTab.document.open();
      newTab.document.write(pageHtml);
      newTab.document.close();
    } catch (err) {
      console.error("Open file error:", err);
      const detail = err.response?.data?.detail || err.message || "Unable to open file";
      showToast({ type: "error", text: `Unable to open file: ${detail}` });
    }
  };

  if (loading) return <div className="empty-state">Loading document...</div>;
  if (!doc) return <div className="empty-state">Document not found.</div>;

  const isPdf = doc.content_type === "application/pdf" || previewUrl.toLowerCase().endsWith(".pdf");

  return (
    <div className="page-shell document-review-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Document review</p>
          <h1>{doc.document_type_name || "Document"}</h1>
          <p className="page-subtitle">Review submission from {doc.employee_name}</p>
        </div>
      </div>

      <div className="review-grid">
        <aside className="preview-column">
          {previewUrl ? (
            isPdf ? (
              <object data={previewUrl} type="application/pdf" className="doc-preview" aria-label="Document preview">
                <p>Preview not available. <a href={previewUrl} target="_blank" rel="noreferrer">Open file</a></p>
              </object>
            ) : (
              <img src={previewUrl} alt={doc.original_filename} className="doc-preview" />
            )
          ) : (
            <div className="empty-state">
              <div>No preview available.</div>
              <div style={{ marginTop: 8 }}>
                <button className="secondary-btn" onClick={handleOpenFile} type="button">Try open file</button>
                {accessInfo.url && (
                  <div style={{ marginTop: 8, wordBreak: "break-all", fontSize: 12 }}>
                    <div className="helper-text">Access URL:</div>
                    <a href={accessInfo.url} target="_blank" rel="noreferrer">{accessInfo.url}</a>
                  </div>
                )}
                {accessInfo.error && (
                  <div style={{ marginTop: 8, color: "#c00", fontSize: 13 }}>
                    <div className="helper-text">Access error:</div>
                    <div>{String(accessInfo.error)}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>

        <section className="details-column panel-card">
          <div className="panel-head">
            <div>
              <h3>Details</h3>
              <p className="panel-subtitle">Metadata and review timeline</p>
            </div>
          </div>

          <div className="doc-meta">
            <div>
              <p className="helper-text">Filename</p>
              <strong>{doc.original_filename}</strong>
            </div>
            <div>
              <p className="helper-text">Uploaded</p>
              <strong>{new Date(doc.uploaded_at).toLocaleString()}</strong>
            </div>
            <div>
              <p className="helper-text">Status</p>
              <span className={`status-badge ${doc.status?.toLowerCase()}`}>{doc.status}</span>
            </div>
          </div>

          <div>
            <h4>Timeline</h4>
            {history.length === 0 ? (
              <div className="empty-state">No history available.</div>
            ) : (
              <div className="timeline">
                {history.map((h) => (
                  <div className="timeline-item" key={h.id || h.timestamp}>
                    <div className="timeline-dot" />
                    <div>
                      <strong>{h.action}</strong>
                      <p className="helper-text">{h.user_name} • {new Date(h.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="review-actions">
            <button className="primary-btn" onClick={handleApprove} disabled={actionLoading}>Approve</button>

            <div className="reject-box">
              <textarea placeholder="Rejection reason (required)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
              <button className="secondary-btn" onClick={handleReject} disabled={actionLoading}>Reject</button>
            </div>
          </div>
        </section>
      </div>

      {toast && (
        <div className={`toast ${toast.type === "error" ? "toast-error" : "toast-success"}`}>{toast.text}</div>
      )}
    </div>
  );
}

export default DocumentReview;
