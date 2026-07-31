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
    <div>
      <h1>Document Settings</h1>

      {error && <p>{error}</p>}
      {success && <p>{success}</p>}

      {/* ====================================
          EXISTING DOCUMENT TYPES
      ==================================== */}

      <section>
        <h2>Document Types</h2>

        {loadingTypes ? (
          <p>Loading document types...</p>
        ) : documentTypes.length === 0 ? (
          <p>No document types found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {documentTypes.map((documentType) => (
                <tr key={documentType.id}>
                  <td>{documentType.id}</td>

                  <td>{documentType.name}</td>

                  <td>
                    {documentType.description || "-"}
                  </td>

                  <td>
                    {documentType.is_active
                      ? "ACTIVE"
                      : "INACTIVE"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <hr />

      {/* ====================================
          ADD DOCUMENT TYPE
      ==================================== */}

      <section>
        <h2>Add Document Type</h2>

        <form onSubmit={handleAddDocumentType}>
          <div>
            <label>Document Name</label>

            <br />

            <input
              type="text"
              name="name"
              value={typeForm.name}
              onChange={handleTypeChange}
              placeholder="Example: Passport"
              required
            />
          </div>

          <br />

          <div>
            <label>Description</label>

            <br />

            <textarea
              name="description"
              value={typeForm.description}
              onChange={handleTypeChange}
              placeholder="Enter document description"
              rows="3"
            />
          </div>

          <br />

          <button
            type="submit"
            disabled={addingType}
          >
            {addingType
              ? "Adding..."
              : "Add Document Type"}
          </button>
        </form>
      </section>

      <hr />

      {/* ====================================
          ADD DOCUMENT REQUIREMENT
      ==================================== */}

      <section>
        <h2>Add Document Requirement</h2>

        <form onSubmit={handleAddRequirement}>
          <div>
            <label>Document Type</label>

            <br />

            <select
              name="document_type_id"
              value={
                requirementForm.document_type_id
              }
              onChange={handleRequirementChange}
              required
            >
              <option value="">
                Select Document
              </option>

              {documentTypes
                .filter(
                  (documentType) =>
                    documentType.is_active
                )
                .map((documentType) => (
                  <option
                    key={documentType.id}
                    value={documentType.id}
                  >
                    {documentType.name}
                  </option>
                ))}
            </select>
          </div>

          <br />

          <div>
  <label>Employment Type</label>

  <br />

  <select
    name="employment_type"
    value={requirementForm.employment_type}
    onChange={handleRequirementChange}
    required
  >
    <option value="">Select Employment Type</option>
    <option value="FULL_TIME">Full Time</option>
    <option value="CONTRACT">Contract</option>
  </select>
</div>

          <br />

          <div>
            <label>
              <input
                type="checkbox"
                name="is_required"
                checked={
                  requirementForm.is_required
                }
                onChange={handleRequirementChange}
              />

              {" "}Required
            </label>
          </div>

          <br />

          <button
            type="submit"
            disabled={addingRequirement}
          >
            {addingRequirement
              ? "Adding..."
              : "Add Requirement"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default DocumentSettings;