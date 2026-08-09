import { useEffect, useState } from "react";
import api from "../../api/api";
import { DataTable, EmptyState, FormField, PageHeader, Skeleton, StatusBadge } from "../../components/ui";
import { useToast } from "../../components/ToastProvider";

function DocumentSettings() {
  const [documentTypes, setDocumentTypes] = useState([]);

  const [typeForm, setTypeForm] = useState({
    name: "",
    description: "",
    tracks_expiry: false,
    category: "ONBOARDING",
  });

  const [requirementForm, setRequirementForm] = useState({
    document_type_id: "",
    employment_type: "",
    is_required: true,
  });

  const [loadingTypes, setLoadingTypes] = useState(true);
  const [addingType, setAddingType] = useState(false);
  const [addingRequirement, setAddingRequirement] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const showToast = useToast();

  // ----------------------------------------
  // Error helper
  // ----------------------------------------

  const getErrorMessage = (err, fallback) => {
    const detail = err.response?.data?.detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((item) => item.msg || "Validation error")
        .join(", ");
    }

    return fallback;
  };

  // ----------------------------------------
  // GET /documents/types
  // ----------------------------------------

  const fetchDocumentTypes = async () => {
    try {
      setLoadingTypes(true);
      setError("");

      const response = await api.get("/documents/types");

      console.log("Document types:", response.data);

      setDocumentTypes(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      console.error(
        "Fetch document types error:",
        err.response?.data || err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to load document types."
        )
      );
    } finally {
      setLoadingTypes(false);
    }
  };

  useEffect(() => {
    fetchDocumentTypes();
  }, []);

  // ----------------------------------------
  // Document type form
  // ----------------------------------------

  const handleTypeChange = (e) => {
    const { name, value, type, checked } = e.target;

    setTypeForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ----------------------------------------
  // POST /documents/types
  // ----------------------------------------

  const handleAddDocumentType = async (e) => {
    e.preventDefault();

    if (!typeForm.name.trim()) {
      setError("Document type name is required.");
      return;
    }

    try {
      setAddingType(true);
      setError("");
      setSuccess("");

      const payload = {
        name: typeForm.name.trim(),
        description: typeForm.description.trim(),
        tracks_expiry: typeForm.tracks_expiry,
        category: typeForm.category,
      };

      const response = await api.post(
        "/documents/types",
        payload
      );

      console.log(
        "Document type created:",
        response.data
      );

      setSuccess("Document type added successfully.");
      showToast("Document type added successfully.");

      setTypeForm({
        name: "",
        description: "",
        tracks_expiry: false,
        category: "ONBOARDING",
      });

      // Refresh the list
      await fetchDocumentTypes();
    } catch (err) {
      console.error(
        "Add document type error:",
        err.response?.data || err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to add document type."
        )
      );
    } finally {
      setAddingType(false);
    }
  };

  // ----------------------------------------
  // Requirement form
  // ----------------------------------------

  const handleRequirementChange = (e) => {
    const { name, value, type, checked } = e.target;

    setRequirementForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ----------------------------------------
  // POST /documents/requirements
  // ----------------------------------------

  const handleAddRequirement = async (e) => {
    e.preventDefault();

    if (!requirementForm.document_type_id) {
      setError("Please select a document type.");
      return;
    }

    if (!requirementForm.employment_type.trim()) {
      setError("Employment type is required.");
      return;
    }

    try {
      setAddingRequirement(true);
      setError("");
      setSuccess("");

      const payload = {
        document_type_id: Number(
          requirementForm.document_type_id
        ),
        employment_type:
          requirementForm.employment_type.trim(),
        is_required: requirementForm.is_required,
      };

      console.log("Requirement payload:", payload);

      const response = await api.post(
        "/documents/requirements",
        payload
      );

      console.log(
        "Requirement created:",
        response.data
      );

      setSuccess(
        "Document requirement added successfully."
      );
      showToast("Document requirement added successfully.");

      setRequirementForm({
        document_type_id: "",
        employment_type: "",
        is_required: true,
      });
    } catch (err) {
      console.error(
        "Add requirement error:",
        err.response?.data || err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to add document requirement."
        )
      );
    } finally {
      setAddingRequirement(false);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Configuration" title="Document settings" description="Manage document types, set requirements by employment type, and control the onboarding workflow." />

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Document Types List */}
      <section className="panel-card">
        <div className="panel-head">
          <div>
            <h3>Document types</h3>
            <p className="panel-subtitle">Configure the types of documents required during onboarding.</p>
          </div>
        </div>

        {loadingTypes ? (
          <Skeleton lines={3} />
        ) : documentTypes.length === 0 ? (
          <EmptyState title="No document types configured" description="Add a document type below to begin configuring requirements." />
        ) : (
          <DataTable rows={documentTypes} getRowKey={(item) => item.id} columns={[{ key: "name", label: "Document name", render: (item) => <strong>{item.name}</strong> }, { key: "description", label: "Description", render: (item) => item.description || "—" }, { key: "expiry", label: "Expiry tracking", render: (item) => item.tracks_expiry ? "Required" : "Not tracked" }, { key: "status", label: "Status", render: (item) => <StatusBadge status={item.is_active ? "Active" : "Inactive"} /> }]} />
        )}
      </section>

      {/* Add Document Type Form */}
      <section className="panel-card">
        <div className="panel-head">
          <div>
            <h3>Add document type</h3>
            <p className="panel-subtitle">Create a new document type for onboarding requirements.</p>
          </div>
        </div>

        <form onSubmit={handleAddDocumentType} className="form-stack">
          <FormField label="Document name">
            <input
              type="text"
              name="name"
              value={typeForm.name}
              onChange={handleTypeChange}
              placeholder="Example: Passport"
              required
            />
          </FormField>

          <FormField label="Description">
            <textarea
              name="description"
              value={typeForm.description}
              onChange={handleTypeChange}
              placeholder="Explain what this document is for..."
              rows="3"
            />
          </FormField>

          <FormField label="Document category">
            <select name="category" value={typeForm.category} onChange={handleTypeChange}>
              <option value="ONBOARDING">Onboarding</option>
              <option value="PAYSLIP">Payslip</option>
              <option value="TAX">Tax document</option>
              <option value="LETTER">Employment letter</option>
              <option value="POLICY">Policy</option>
              <option value="OTHER">Other</option>
            </select>
          </FormField>

          <label className="field field-checkbox">
            <input
              type="checkbox"
              name="tracks_expiry"
              checked={typeForm.tracks_expiry}
              onChange={handleTypeChange}
            />
            <span>This document has an expiry date (for example, a passport or work permit)</span>
          </label>

          <button type="submit" className="primary-btn" disabled={addingType}>
            {addingType ? "Adding..." : "Add document type"}
          </button>
        </form>
      </section>

      {/* Add Document Requirement Form */}
      <section className="panel-card">
        <div className="panel-head">
          <div>
            <h3>Add document requirement</h3>
            <p className="panel-subtitle">Specify which documents are required for different employment types.</p>
          </div>
        </div>

        <form onSubmit={handleAddRequirement} className="form-stack">
          <label className="field">
            <span>Document type</span>
            <select
              name="document_type_id"
              value={requirementForm.document_type_id}
              onChange={handleRequirementChange}
              required
            >
              <option value="">Select a document type</option>
              {documentTypes
                .filter((documentType) => documentType.is_active)
                .map((documentType) => (
                  <option key={documentType.id} value={documentType.id}>
                    {documentType.name}
                  </option>
                ))}
            </select>
          </label>

          <label className="field">
            <span>Employment type</span>
            <select
              name="employment_type"
              value={requirementForm.employment_type}
              onChange={handleRequirementChange}
              required
            >
              <option value="">Select employment type</option>
              <option value="FULL_TIME">Full Time</option>
              <option value="CONTRACT">Contract</option>
            </select>
          </label>

          <label className="field field-checkbox">
            <input
              type="checkbox"
              name="is_required"
              checked={requirementForm.is_required}
              onChange={handleRequirementChange}
            />
            <span>Mark as required</span>
          </label>

          <button type="submit" className="primary-btn" disabled={addingRequirement}>
            {addingRequirement ? "Adding..." : "Add requirement"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default DocumentSettings;
