import { useState } from "react";
import api from "../../api/api";

function Employees() {
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    department: "",
    designation: "",
    employment_type: "",
    joining_date: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createdEmployee, setCreatedEmployee] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      setCreatedEmployee(null);

      const response = await api.post("/employees", formData);

      console.log("Employee created:", response.data);

      setCreatedEmployee(response.data);
      setSuccess("Employee added successfully.");

      setFormData({
        email: "",
        first_name: "",
        last_name: "",
        department: "",
        designation: "",
        employment_type: "",
        joining_date: "",
      });
    } catch (err) {
      console.error("Add employee error:", err.response?.data || err);

      const detail = err.response?.data?.detail;

      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(
          detail.map((item) => item.msg).join(", ")
        );
      } else {
        setError("Unable to add employee.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Employees</h1>

      <h2>Add Employee</h2>

      {error && <p>{error}</p>}
      {success && <p>{success}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Email</label>
          <br />

          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <br />

        <div>
          <label>First Name</label>
          <br />

          <input
            type="text"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            required
          />
        </div>

        <br />

        <div>
          <label>Last Name</label>
          <br />

          <input
            type="text"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            required
          />
        </div>

        <br />

        <div>
          <label>Department</label>
          <br />

          <input
            type="text"
            name="department"
            value={formData.department}
            onChange={handleChange}
            required
          />
        </div>

        <br />

        <div>
          <label>Designation</label>
          <br />

          <input
            type="text"
            name="designation"
            value={formData.designation}
            onChange={handleChange}
            required
          />
        </div>

        <br />

        <div>
          <label>Employment Type</label>
          <br />

          <input
            type="text"
            name="employment_type"
            value={formData.employment_type}
            onChange={handleChange}
            required
          />
        </div>

        <br />

        <div>
          <label>Joining Date</label>
          <br />

          <input
            type="date"
            name="joining_date"
            value={formData.joining_date}
            onChange={handleChange}
            required
          />
        </div>

        <br />

        <button type="submit" disabled={loading}>
          {loading ? "Adding..." : "Add Employee"}
        </button>
      </form>

      {createdEmployee && (
        <div>
          <h2>Employee Created</h2>

          <p>
            Employee Code:{" "}
            <strong>{createdEmployee.employee_code}</strong>
          </p>

          <p>
            Name: {createdEmployee.first_name}{" "}
            {createdEmployee.last_name}
          </p>

          <p>Department: {createdEmployee.department}</p>

          <p>Designation: {createdEmployee.designation}</p>

          <p>
            Employment Type: {createdEmployee.employment_type}
          </p>

          <p>Joining Date: {createdEmployee.joining_date}</p>
        </div>
      )}
    </div>
  );
}

export default Employees;