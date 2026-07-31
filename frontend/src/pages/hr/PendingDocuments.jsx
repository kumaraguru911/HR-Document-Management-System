import { useEffect, useState } from "react";
import api from "../../api/api";

function PendingDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejectReasons, setRejectReasons] = useState({});

  // =========================
  // Fetch Pending Documents
  // =========================
  const fetchPendingDocuments = async () => {
    try {
      setError("");

      const response = await api.get("/documents/pending");

      console.log("Pending documents:", response.data);

      setDocuments(response.data);
    } catch (err) {
      console.error("Failed to fetch pending documents:", err);

      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Unable to load pending documents."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingDocuments();
  }, []);

  // =========================
  // View Document
  // =========================
  const handleView = async (documentId) => {
    try {
      setError("");

      const response = await api.get(
        `/documents/${documentId}/access`
      );

      console.log("Document access response:", response.data);

      const url = response.data.url;

      if (!url) {
        setError("Document URL was not returned.");
        return;
      }

      console.log("Opening URL:", url);

      const link = document.createElement("a");

      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);
    } catch (err) {
      console.error(
        "Document access error:",
        err.response?.data || err
      );

      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Unable to access document."
      );
    }
  };

  // =========================
  // Approve Document
  // =========================
  const handleApprove = async (documentId) => {
    try {
      setError("");

      await api.post(
        `/documents/${documentId}/approve`
      );

      console.log("Document approved:", documentId);

      // Reload pending documents
      await fetchPendingDocuments();
    } catch (err) {
      console.error("Approve error:", err);

      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Unable to approve document."
      );
    }
  };

  // =========================
  // Reject Document
  // =========================
  const handleReject = async (documentId) => {
    const reason =
      rejectReasons[documentId]?.trim();

    if (!reason) {
      setError("Please enter a rejection reason.");
      return;
    }

    try {
      setError("");

      await api.post(
        `/documents/${documentId}/reject`,
        {
          reason,
        }
      );

      console.log("Document rejected:", documentId);

      // Clear rejection reason
      setRejectReasons((prev) => ({
        ...prev,
        [documentId]: "",
      }));

      // Reload pending documents
      await fetchPendingDocuments();
    } catch (err) {
      console.error("Reject error:", err);

      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Unable to reject document."
      );
    }
  };

  // =========================
  // Loading
  // =========================
  if (loading) {
    return (
      <div>
        <h1>Pending Documents</h1>
        <p>Loading...</p>
      </div>
    );
  }

  // =========================
  // UI
  // =========================
  return (
    <div>
      <h1>Pending Documents</h1>

      {error && <p>{error}</p>}

      {documents.length === 0 ? (
        <p>No pending documents.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Employee Code</th>
              <th>Document</th>
              <th>Filename</th>
              <th>Size</th>
              <th>Uploaded</th>
              <th>Status</th>
              <th>Review</th>
            </tr>
          </thead>

          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id}>

                {/* Employee */}
                <td>
                  {doc.employee_name}
                </td>

                {/* Employee Code */}
                <td>
                  {doc.employee_code}
                </td>

                {/* Document Type */}
                <td>
                  {doc.document_type_name}
                </td>

                {/* Filename */}
                <td>
                  {doc.original_filename}
                </td>

                {/* File Size */}
                <td>
                  {doc.file_size
                    ? `${(
                        doc.file_size / 1024
                      ).toFixed(1)} KB`
                    : "-"}
                </td>

                {/* Uploaded Time */}
                <td>
                  {doc.uploaded_at
                    ? new Date(
                        doc.uploaded_at
                      ).toLocaleString()
                    : "-"}
                </td>

                {/* Status */}
                <td>
                  {doc.status}
                </td>

                {/* Review Actions */}
                <td>

                  {/* View */}
                  <button
                    type="button"
                    onClick={() =>
                      handleView(doc.id)
                    }
                  >
                    View
                  </button>

                  {" "}

                  {/* Approve */}
                  <button
                    type="button"
                    onClick={() =>
                      handleApprove(doc.id)
                    }
                  >
                    Approve
                  </button>

                  <br />

                  {/* Rejection Reason */}
                  <input
                    type="text"
                    placeholder="Rejection reason"
                    value={
                      rejectReasons[doc.id] || ""
                    }
                    onChange={(e) =>
                      setRejectReasons(
                        (prev) => ({
                          ...prev,
                          [doc.id]:
                            e.target.value,
                        })
                      )
                    }
                  />

                  {" "}

                  {/* Reject */}
                  <button
                    type="button"
                    onClick={() =>
                      handleReject(doc.id)
                    }
                  >
                    Reject
                  </button>

                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default PendingDocuments;