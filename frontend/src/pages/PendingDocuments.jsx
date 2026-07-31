import { useEffect, useState } from "react";
import api from "../api/api";

function PendingDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPendingDocuments = async () => {
      try {
        const response = await api.get("/documents/pending");

        console.log("Pending documents:", response.data);

        setDocuments(response.data);
      } catch (err) {
        console.error("Failed to fetch pending documents:", err);

        const detail = err.response?.data?.detail;

        setError(
          typeof detail === "string"
            ? detail
            : "Failed to load pending documents."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPendingDocuments();
  }, []);

  if (loading) {
    return <p>Loading pending documents...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div>
      <h1>Pending Documents</h1>

      {documents.length === 0 ? (
        <p>No pending documents.</p>
      ) : (
        <pre>{JSON.stringify(documents, null, 2)}</pre>
      )}
    </div>
  );
}

export default PendingDocuments;