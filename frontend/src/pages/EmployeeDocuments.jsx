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

      setError(
        typeof detail === "string"
          ? detail
          : "Unable to load document checklist."
      );
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

    const formData = new FormData();

    formData.append("file", file);

    await api.post(
      `/documents/my/upload/${documentTypeId}`,
      formData
    );

    await fetchChecklist();

    setSelectedFiles((prev) => ({
      ...prev,
      [documentTypeId]: null,
    }));

  } catch (err) {
    console.error("Upload error:", err);
    console.error("Backend response:", err.response?.data);

    const detail = err.response?.data?.detail;

    setError(
      typeof detail === "string"
        ? detail
        : "Unable to upload document."
    );
  }
};

  if (loading) {
    return <p>Loading documents...</p>;
  }

  return (
    <div>
      <h1>My Documents</h1>

      {error && <p>{error}</p>}
      {message && <p>{message}</p>}

      {documents.length === 0 ? (
        <p>No document requirements found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Document</th>
              <th>Description</th>
              <th>Required</th>
              <th>Status</th>
              <th>Upload</th>
            </tr>
          </thead>

          <tbody>
            {documents.map((document) => (
              <tr key={document.document_type_id}>
                <td>{document.name}</td>

                <td>{document.description}</td>

                <td>
                  {document.required ? "Yes" : "No"}
                </td>

                <td>
                  {document.status || "NOT SUBMITTED"}
                </td>

                <td>
                  {document.status === "APPROVED" ? (
                    <span>Completed</span>
                  ) : (
                    <>
                      <input
                        type="file"
                        onChange={(e) =>
                          handleFileChange(
                            document.document_type_id,
                            e.target.files[0]
                          )
                        }
                      />

                      <button
                        type="button"
                        disabled={
                          uploadingId === document.document_type_id
                        }
                        onClick={() =>
                          handleUpload(document.document_type_id)
                        }
                      >
                        {uploadingId === document.document_type_id
                          ? "Uploading..."
                          : document.status === "REJECTED"
                          ? "Re-upload"
                          : "Upload"}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default EmployeeDocuments;