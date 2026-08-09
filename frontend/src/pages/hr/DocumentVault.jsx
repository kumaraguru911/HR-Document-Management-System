import { useEffect, useState } from "react";
import api from "../../api/api";
import { FilePicker, PageHeader, Skeleton } from "../../components/ui";
import { useToast } from "../../components/ToastProvider";

function DocumentVault() {
  const [employees, setEmployees] = useState([]);
  const [types, setTypes] = useState([]);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ employee_id: "", document_type_id: "" });
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const selectedEmployee = employees.find((employee) => String(employee.id) === form.employee_id);
  const selectedType = types.find((type) => String(type.id) === form.document_type_id);

  useEffect(() => {
    Promise.all([api.get("/employees"), api.get("/documents/types")])
      .then(([employeeResponse, typeResponse]) => {
        setEmployees(employeeResponse.data || []);
        setTypes((typeResponse.data || []).filter((type) => type.is_active && type.category !== "ONBOARDING"));
      })
      .catch((err) => setError(err.response?.data?.detail || "Unable to prepare the document vault."))
      .finally(() => setLoading(false));
  }, []);

  const publish = async (event) => {
    event.preventDefault();
    if (!file) { setError("Choose a PDF, JPEG, or PNG file first."); return; }
    try {
      setPublishing(true); setError("");
      const data = new FormData();
      data.append("employee_id", form.employee_id);
      data.append("document_type_id", form.document_type_id);
      data.append("file", file);
      await api.post("/documents/vault/upload", data);
      setFile(null); setForm({ employee_id: "", document_type_id: "" });
      toast("Document published securely. The employee has been notified.");
    } catch (err) { setError(err.response?.data?.detail || "Unable to publish the document."); }
    finally { setPublishing(false); }
  };

  if (loading) return <Skeleton lines={5} />;
  return (
    <div className="page-shell vault-page">
      <PageHeader eyebrow="Employee self-service" title="Publish employee documents" description="Securely publish payslips, tax records, employment letters, and policies directly to an employee's vault." />
      {error && <div className="alert alert-error">{error}</div>}
      {!types.length ? (
        <section className="panel-card vault-empty-card"><h3>Create a vault document type first</h3><p className="panel-subtitle">Go to Document settings and add a type using Payslip, Tax document, Employment letter, Policy, or Other as its category.</p></section>
      ) : (
        <div className="vault-publish-layout">
          <section className="panel-card vault-publish-card">
            <div className="panel-head"><div><p className="eyebrow">Secure delivery</p><h3>Publish a document</h3><p className="panel-subtitle">The file is stored securely and is available only to the selected employee.</p></div></div>
            <form className="vault-publish-form" onSubmit={publish}>
              <div className="vault-publish-form__fields">
                <label className="field"><span>Employee</span><select value={form.employee_id} onChange={(event) => setForm({ ...form, employee_id: event.target.value })} required><option value="">Select employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name} · {employee.employee_code}</option>)}</select></label>
                <label className="field"><span>Document type</span><select value={form.document_type_id} onChange={(event) => setForm({ ...form, document_type_id: event.target.value })} required><option value="">Select category and type</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name} · {type.category.replace("_", " ")}</option>)}</select></label>
              </div>
              <div className="vault-file-section"><span className="field-label">Document file</span><FilePicker file={file} onChange={setFile} disabled={publishing} /></div>
              <button className="primary-btn vault-publish-button" type="submit" disabled={publishing || !file || !form.employee_id || !form.document_type_id}>{publishing ? "Publishing…" : "Publish to employee vault"}</button>
            </form>
          </section>
          <aside className="stack vault-side-stack">
            <section className="panel-card vault-summary-card"><p className="eyebrow">Delivery summary</p><h3>Ready to publish</h3><div className="vault-summary-list"><div><span>Recipient</span><strong>{selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : "Choose an employee"}</strong></div><div><span>Document</span><strong>{selectedType?.name || "Choose a document type"}</strong></div><div><span>File</span><strong>{file?.name || "Choose a file"}</strong></div></div></section>
            <section className="panel-card vault-help-card"><h3>What happens next?</h3><ol><li>The document is saved in the employee's secure vault.</li><li>The employee receives an in-app notification.</li><li>They can download it whenever they need it.</li></ol></section>
          </aside>
        </div>
      )}
    </div>
  );
}

export default DocumentVault;
