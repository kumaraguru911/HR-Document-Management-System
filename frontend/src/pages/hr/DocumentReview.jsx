import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../../api/api";
import { ConfirmDialog, EmptyState, PageHeader, StatusBadge, Timeline } from "../../components/ui";
import { useToast } from "../../components/ToastProvider";

function DocumentReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [doc, setDoc] = useState(location.state?.document || null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [accessInfo, setAccessInfo] = useState({ url: "", filename: "", status: null, error: null });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmation, setConfirmation] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const showToast = useToast();

  useEffect(() => {
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
          } catch {
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
            filename: downloadRes.headers["content-disposition"]?.split("filename=")[1]?.replace(/"/g, "") || minimalDoc?.original_filename || "",
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
            showToast("Unable to load file preview (access may be restricted).", "error");
          }
        }

        const histRes = await api.get(`/documents/${id}/history`).catch(() => ({ data: [] }));
        setHistory(histRes.data || []);
      } catch {
        showToast("Unable to load document.", "error");
      } finally {
        setLoading(false);
      }
    };

    fetch();

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [id, location.state, showToast]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await api.post(`/documents/${id}/approve`);
      showToast("Document approved.");
      navigate("/hr/documents");
    } catch {
      showToast("Failed to approve document.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showToast("Please enter a rejection reason.", "error");
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/documents/${id}/reject`, { reason: rejectReason });
      showToast("Document rejected and employee notified.");
      navigate("/hr/documents");
    } catch {
      showToast("Failed to reject document.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenFile = async () => {
    try {
      if (accessInfo.url) {
        window.open(accessInfo.url, "_blank", "noopener,noreferrer");
        return;
      }

      const newTab = window.open("about:blank", "_blank");
      if (!newTab) {
        showToast("Unable to open new tab. Please allow popups for this site.", "error");
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
      showToast(`Unable to open file: ${detail}`, "error");
    }
  };

  if (loading) return <EmptyState title="Loading document" />;
  if (!doc) return <EmptyState title="Document not found" />;

  const isPdf = doc.content_type === "application/pdf" || previewUrl.toLowerCase().endsWith(".pdf");

  return (
    <div className="page-shell document-review-shell">
      <PageHeader eyebrow="Document review" title={doc.document_type_name || "Document"} description={`Review submission from ${doc.employee_name}`} />

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
              <StatusBadge status={doc.status} />
            </div>
          </div>

          <div>
            <h4>Timeline</h4>
            {history.length === 0 ? (
              <div className="empty-state">No history available.</div>
            ) : (
              <Timeline items={history.map((item) => ({ id: item.id || item.timestamp, title: item.action, meta: `${item.user_name} · ${new Date(item.timestamp).toLocaleString()}` }))} />
            )}
          </div>

          <div className="review-actions">
            <button className="primary-btn" onClick={() => setConfirmation("approve")} disabled={actionLoading}>Approve</button>

            <div className="reject-box">
              <textarea placeholder="Rejection reason (required)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
              <button className="secondary-btn" onClick={() => setConfirmation("reject")} disabled={actionLoading}>Reject</button>
            </div>
          </div>
        </section>
      </div>

      {confirmation && <ConfirmDialog title={confirmation === "approve" ? "Approve document?" : "Reject document?"} description={confirmation === "approve" ? "This approval cannot be undone." : "The employee will be notified with your rejection reason."} confirmLabel={confirmation === "approve" ? "Approve" : "Reject"} tone={confirmation === "reject" ? "danger" : "primary"} loading={actionLoading} onCancel={() => setConfirmation(null)} onConfirm={() => { setConfirmation(null); if (confirmation === "approve") handleApprove(); else handleReject(); }} />}
    </div>
  );
}

export default DocumentReview;
