import { useEffect, useMemo, useState } from "react";
import api from "../../api/api";
import { EmptyState, PageHeader, Skeleton } from "../../components/ui";

const labels = { PAYSLIP: "Payslips", TAX: "Tax documents", LETTER: "Employment letters", POLICY: "Policies", OTHER: "Other documents" };

function EmployeeVault() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);
  useEffect(() => { api.get("/documents/vault/my").then((response) => setDocuments(response.data || [])).catch((err) => setError(err.response?.data?.detail || "Unable to load your document vault.")).finally(() => setLoading(false)); }, []);
  const groups = useMemo(() => documents.reduce((result, document) => ({ ...result, [document.category]: [...(result[document.category] || []), document] }), {}), [documents]);
  const download = async (item) => { try { setDownloadingId(item.id); const response = await api.get(`/documents/${item.id}/download`, { responseType: "blob" }); const url = URL.createObjectURL(response.data); const link = Object.assign(document.createElement("a"), { href: url, download: item.original_filename }); document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); } catch { setError("Unable to download this file."); } finally { setDownloadingId(null); } };
  if (loading) return <Skeleton lines={5} />;
  return <div className="page-shell"><PageHeader eyebrow="Employee self-service" title="My document vault" description="Secure access to payslips, tax documents, employment letters, and policies published by HR." />{error && <div className="alert alert-error">{error}</div>}{documents.length ? <div className="stack">{Object.entries(groups).map(([category, items]) => <section className="panel-card" key={category}><div className="panel-head"><div><h3>{labels[category] || category}</h3><p className="panel-subtitle">{items.length} document{items.length === 1 ? "" : "s"} available</p></div></div><div className="review-list">{items.map((item) => <div className="review-item" key={item.id}><div><strong>{item.document_type_name}</strong><p>{item.original_filename} · {new Date(item.uploaded_at).toLocaleDateString()}</p></div><button type="button" className="secondary-btn" onClick={() => download(item)} disabled={downloadingId === item.id}>{downloadingId === item.id ? "Downloading…" : "Download"}</button></div>)}</div></section>)}</div> : <EmptyState title="No documents published yet" description="HR will publish your payslips, tax records, and letters here." />}</div>;
}
export default EmployeeVault;
