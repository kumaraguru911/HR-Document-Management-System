import { useEffect, useState } from "react";
import api from "../../api/api";

function DocumentSettings() {
  const [documentTypes, setDocumentTypes] = useState([]);

  const [typeForm, setTypeForm] = useState({
    name: "",
    description: "",
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
    const { name, value } = e.target;

    setTypeForm((prev) => ({
      ...prev,
      [name]: value,
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

      setTypeForm({
        name: "",
        description: "",
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
      <section className="page-header hero-banner">
        <div className="hero-copy">
          <p className="eyebrow">Configuration</p>
          <h1>Document settings</h1>
          <p className="page-subtitle">
            Manage document types, set requirements by employment type, and control the onboarding workflow.
          </p>
        </div>
      </section>

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
          <p className="helper-text">Loading document types...</p>
        ) : documentTypes.length === 0 ? (
          <div className="empty-state">No document types configured yet. Add one below.</div>
        ) : (
          <div className="table-container">
            <table className="settings-table">
              <thead>
                <tr>
                  <th>Document name</th>
                  <th>Description</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {documentTypes.map((documentType) => (
                  <tr key={documentType.id}>
                    <td><strong>{documentType.name}</strong></td>
                    <td>{documentType.description || "—"}</td>
                    <td>
                      <span className={`status-badge ${documentType.is_active ? "active" : "inactive"}`}>
                        {documentType.is_active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          <label className="field">
            <span>Document name</span>
            <input
              type="text"
              name="name"
              value={typeForm.name}
              onChange={handleTypeChange}
              placeholder="Example: Passport"
              required
            />
          </label>

          <label className="field">
            <span>Description</span>
            <textarea
              name="description"
              value={typeForm.description}
              onChange={handleTypeChange}
              placeholder="Explain what this document is for..."
              rows="3"
            />
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