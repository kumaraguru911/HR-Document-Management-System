import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/api";
import { DataTable, Drawer, EmptyState, FilterPanel, PageHeader, ProgressBar, StatusBadge } from "../../components/ui";

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [employeeDocuments, setEmployeeDocuments] = useState({});
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [employmentFilter, setEmploymentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [completionFilter, setCompletionFilter] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    department: "",
    designation: "",
    employment_type: "",
    joining_date: "",
  });

  const fetchEmployees = async () => {
    try {
      setError("");
      const [employeesResponse, auditResponse] = await Promise.all([
        api.get("/employees"),
        api.get("/audit"),
      ]);

      const employeeList = employeesResponse.data || [];
      setEmployees(employeeList);
      setAuditLogs(auditResponse.data || []);

      const documentResponses = await Promise.all(
        employeeList.map((employee) => api.get(`/documents/employee/${employee.id}`).then((response) => ({
          id: employee.id,
          documents: response.data || [],
        })))
      );

      const documentMap = documentResponses.reduce((accumulator, item) => {
        accumulator[item.id] = item.documents;
        return accumulator;
      }, {});

      setEmployeeDocuments(documentMap);
    } catch (err) {
      console.error("Employee fetch error:", err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Unable to load employee directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const departmentOptions = useMemo(() => ["All", ...new Set(employees.map((employee) => employee.department).filter(Boolean))], [employees]);
  const employmentOptions = useMemo(() => ["All", ...new Set(employees.map((employee) => employee.employment_type).filter(Boolean))], [employees]);
  const statusOptions = useMemo(() => ["All", ...new Set(employees.map((employee) => employee.account_status).filter(Boolean))], [employees]);

  const getProgress = useCallback((employeeId) => {
    const documents = employeeDocuments[employeeId] || [];
    if (!documents.length) return 0;
    const approvedCount = documents.filter((document) => document.status?.toUpperCase() === "APPROVED").length;
    return Math.round((approvedCount / documents.length) * 100);
  }, [employeeDocuments]);

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    return [...employees]
      .filter((employee) => {
        const matchesQuery =
          !normalizedQuery ||
          `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(normalizedQuery) ||
          employee.employee_code.toLowerCase().includes(normalizedQuery) ||
          employee.department.toLowerCase().includes(normalizedQuery) ||
          employee.designation.toLowerCase().includes(normalizedQuery);

        const matchesDepartment = departmentFilter === "All" || employee.department === departmentFilter;
        const matchesEmployment = employmentFilter === "All" || employee.employment_type === employmentFilter;
        const matchesAccountStatus = statusFilter === "All" || employee.account_status === statusFilter;

        const documents = employeeDocuments[employee.id] || [];
        const approvedCount = documents.filter((document) => document.status?.toUpperCase() === "APPROVED").length;
        const progress = documents.length ? Math.round((approvedCount / documents.length) * 100) : 0;
        const isComplete = progress >= 100;

        const matchesCompletion =
          completionFilter === "All" ||
          (completionFilter === "complete" && isComplete) ||
          (completionFilter === "in-progress" && !isComplete);

        return matchesQuery && matchesDepartment && matchesEmployment && matchesAccountStatus && matchesCompletion;
      })
      .sort((left, right) => {
        if (sortBy === "progress") {
          const leftProgress = getProgress(left.id);
          const rightProgress = getProgress(right.id);
          return rightProgress - leftProgress;
        }

        if (sortBy === "department") {
          return left.department.localeCompare(right.department);
        }

        if (sortBy === "status") {
          return left.account_status.localeCompare(right.account_status);
        }

        return `${left.first_name} ${left.last_name}`.localeCompare(`${right.first_name} ${right.last_name}`);
      });
  }, [employees, employeeDocuments, search, departmentFilter, employmentFilter, statusFilter, completionFilter, sortBy, getProgress]);

  const getDocumentStatus = (employeeId) => {
    const documents = employeeDocuments[employeeId] || [];
    if (!documents.length) return "Pending";

    if (documents.some((document) => document.status?.toUpperCase() === "REJECTED")) return "Needs review";
    if (documents.every((document) => document.status?.toUpperCase() === "APPROVED")) return "Approved";
    if (documents.some((document) => document.status?.toUpperCase() === "APPROVED")) return "In review";
    return "Pending";
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      await api.post("/employees", formData);
      setSuccess("Employee invitation sent successfully.");
      setShowInviteForm(false);
      setFormData({
        email: "",
        first_name: "",
        last_name: "",
        department: "",
        designation: "",
        employment_type: "",
        joining_date: "",
      });
      await fetchEmployees();
    } catch (err) {
      console.error("Add employee error:", err.response?.data || err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Unable to add employee.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEmployee = async (employee) => {
    try {
      setDetailLoading(true);
      const [detailResponse, documentsResponse] = await Promise.all([
        api.get(`/employees/${employee.id}`),
        api.get(`/documents/employee/${employee.id}`),
      ]);

      const employeeActivity = auditLogs
        .filter((log) => log.user_id === detailResponse.data.user_id)
        .slice(0, 8)
        .map((log) => ({
          title: log.details || "Activity recorded",
          detail: new Date(log.created_at).toLocaleString(),
          tone: log.action?.toString().includes("DOCUMENT") ? "important" : "neutral",
        }));

      setSelectedEmployee({
        ...detailResponse.data,
        documents: documentsResponse.data || [],
        activity: employeeActivity,
      });
    } catch (err) {
      console.error("Employee detail error:", err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Unable to load employee profile.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAccountAction = async (employeeId, action) => {
    try {
      setActionLoading(true);
      const endpoint = action === "deactivate" ? `/employees/${employeeId}/deactivate` : `/employees/${employeeId}/reactivate`;
      const response = await api.patch(endpoint);

      setEmployees((previous) => previous.map((employee) => (employee.id === employeeId ? { ...employee, ...response.data } : employee)));
      if (selectedEmployee?.id === employeeId) {
        setSelectedEmployee((previous) => previous ? { ...previous, ...response.data } : previous);
      }
      setSuccess(`${response.data.first_name} ${response.data.last_name} was ${action === "deactivate" ? "deactivated" : "reactivated"}.`);
    } catch (err) {
      console.error("Account action error:", err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Unable to update account status.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Employee CRM" title="Employee directory" description="Search, filter, and follow each employee’s onboarding journey from a single view." actions={<button className="primary-btn" onClick={() => setShowInviteForm((previous) => !previous)}>
          {showInviteForm ? "Hide invite form" : "Invite employee"}
        </button>} />

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showInviteForm && (
        <section className="panel-card crm-form-card">
          <div className="panel-head">
            <div>
              <h3>Invite a new employee</h3>
              <p className="panel-subtitle">Create the employee profile and send the activation link.</p>
            </div>
          </div>
          <form className="crm-form" onSubmit={handleSubmit}>
            <div className="crm-form__grid">
              <label>
                <span>Email</span>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required />
              </label>
              <label>
                <span>First name</span>
                <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} required />
              </label>
              <label>
                <span>Last name</span>
                <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} required />
              </label>
              <label>
                <span>Department</span>
                <input type="text" name="department" value={formData.department} onChange={handleChange} required />
              </label>
              <label>
                <span>Designation</span>
                <input type="text" name="designation" value={formData.designation} onChange={handleChange} required />
              </label>
              <label>
                <span>Employment type</span>
                <input type="text" name="employment_type" value={formData.employment_type} onChange={handleChange} required />
              </label>
              <label>
                <span>Joining date</span>
                <input type="date" name="joining_date" value={formData.joining_date} onChange={handleChange} required />
              </label>
            </div>
            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? "Inviting..." : "Send invite"}
            </button>
          </form>
        </section>
      )}

      <section className="panel-card">
        <div className="panel-head">
          <div>
            <h3>Employee roster</h3>
            <p className="panel-subtitle">A searchable, filterable view for day-to-day HR operations.</p>
          </div>
        </div>

        <FilterPanel>
          <label className="crm-field">
            <span>Search</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, code, department..." />
          </label>
          <label className="crm-field">
            <span>Department</span>
            <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
              {departmentOptions.map((option) => (
                <option key={option} value={option}>{option === "All" ? "All departments" : option}</option>
              ))}
            </select>
          </label>
          <label className="crm-field">
            <span>Employment</span>
            <select value={employmentFilter} onChange={(event) => setEmploymentFilter(event.target.value)}>
              {employmentOptions.map((option) => (
                <option key={option} value={option}>{option === "All" ? "All types" : option}</option>
              ))}
            </select>
          </label>
          <label className="crm-field">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {statusOptions.map((option) => (
                <option key={option} value={option}>{option === "All" ? "All statuses" : option}</option>
              ))}
            </select>
          </label>
          <label className="crm-field">
            <span>Completion</span>
            <select value={completionFilter} onChange={(event) => setCompletionFilter(event.target.value)}>
              <option value="All">All progress</option>
              <option value="complete">Complete</option>
              <option value="in-progress">In progress</option>
            </select>
          </label>
          <label className="crm-field">
            <span>Sort by</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="name">Name</option>
              <option value="department">Department</option>
              <option value="status">Account status</option>
              <option value="progress">Onboarding progress</option>
            </select>
          </label>
        </FilterPanel>

        {loading ? (
          <EmptyState title="Loading employee directory" />
        ) : (
          <DataTable rows={filteredEmployees} getRowKey={(employee) => employee.id} onRowClick={handleOpenEmployee} emptyTitle="No employees found" emptyDescription="Try changing the filters or invite a new employee." columns={[
            { key: "employee", label: "Employee", render: (employee) => <div className="crm-employee-cell"><div className="crm-avatar">{(employee.first_name?.[0] || "E").toUpperCase()}</div><div><strong>{`${employee.first_name} ${employee.last_name}`}</strong><p>{employee.email}</p></div></div> },
            { key: "employee_code", label: "Code" }, { key: "designation", label: "Designation" }, { key: "department", label: "Department" },
            { key: "progress", label: "Onboarding", render: (employee) => <ProgressBar value={getProgress(employee.id)} detail={`${getProgress(employee.id)}%`} /> },
            { key: "documents", label: "Documents", render: (employee) => <StatusBadge status={getDocumentStatus(employee.id)} /> },
            { key: "account_status", label: "Status", render: (employee) => <StatusBadge status={employee.account_status} /> },
          ]} />
        )}
      </section>

      {selectedEmployee && (
        <Drawer open title={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`} description={`${selectedEmployee.designation} · ${selectedEmployee.department}`} onClose={() => setSelectedEmployee(null)}>
            {detailLoading ? (
              <div className="empty-state">Loading employee profile...</div>
            ) : (
              <>
                <div className="crm-drawer__header">
                  <div className="crm-employee-cell">
                    <div className="crm-avatar crm-avatar--large">{(selectedEmployee.first_name?.[0] || "E").toUpperCase()}</div>
                    <div>
                      <h3>{`${selectedEmployee.first_name} ${selectedEmployee.last_name}`}</h3>
                      <p>{selectedEmployee.designation} • {selectedEmployee.department}</p>
                    </div>
                  </div>
                </div>

                <div className="crm-drawer__grid">
                  <section className="panel-card crm-section-card">
                    <div className="panel-head">
                      <div>
                        <h3>Personal information</h3>
                        <p className="panel-subtitle">Core profile details and employment context.</p>
                      </div>
                    </div>
                    <div className="crm-detail-list">
                      <div><span>Employee code</span><strong>{selectedEmployee.employee_code}</strong></div>
                      <div><span>Email</span><strong>{selectedEmployee.email}</strong></div>
                      <div><span>Department</span><strong>{selectedEmployee.department}</strong></div>
                      <div><span>Designation</span><strong>{selectedEmployee.designation}</strong></div>
                      <div><span>Employment type</span><strong>{selectedEmployee.employment_type}</strong></div>
                      <div><span>Account status</span><strong>{selectedEmployee.account_status}</strong></div>
                    </div>
                  </section>

                  <section className="panel-card crm-section-card">
                    <div className="panel-head">
                      <div>
                        <h3>Uploaded documents</h3>
                        <p className="panel-subtitle">A clear view of each submission and review state.</p>
                      </div>
                    </div>
                    {selectedEmployee.documents?.length ? (
                      <div className="document-list">
                        {selectedEmployee.documents.map((document) => (
                          <div className="document-row" key={document.id}>
                            <div>
                              <h4>{document.document_type_name}</h4>
                              <p>{document.original_filename}</p>
                            </div>
                            <span className={`status-badge ${document.status?.toLowerCase()}`}>{document.status}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">No documents have been uploaded yet.</div>
                    )}
                  </section>

                  <section className="panel-card crm-section-card">
                    <div className="panel-head">
                      <div>
                        <h3>Onboarding timeline</h3>
                        <p className="panel-subtitle">Milestones and where the employee currently stands.</p>
                      </div>
                    </div>
                    <div className="progress-tracker">
                      {[
                        { label: "Invitation sent", detail: "Account setup was initiated.", tone: "complete" },
                        { label: "Account activated", detail: selectedEmployee.is_active ? "The employee is active in the system." : "Activation is pending or inactive.", tone: selectedEmployee.is_active ? "complete" : "upcoming" },
                        { label: "Documents uploaded", detail: selectedEmployee.documents?.length ? `${selectedEmployee.documents.length} submission(s) received.` : "No uploads yet.", tone: selectedEmployee.documents?.length ? "active" : "upcoming" },
                        { label: "HR verification", detail: selectedEmployee.documents?.some((document) => document.status?.toUpperCase() === "APPROVED") ? "At least one document has been approved." : "Awaiting review.", tone: selectedEmployee.documents?.some((document) => document.status?.toUpperCase() === "APPROVED") ? "active" : "upcoming" },
                        { label: "Onboarding complete", detail: selectedEmployee.is_active && selectedEmployee.documents?.some((document) => document.status?.toUpperCase() === "APPROVED") ? "Ready for the next stage." : "Still in progress.", tone: selectedEmployee.is_active && selectedEmployee.documents?.some((document) => document.status?.toUpperCase() === "APPROVED") ? "complete" : "upcoming" },
                      ].map((step) => (
                        <div className={`progress-step ${step.tone}`} key={step.label}>
                          <div className="progress-step__icon">{step.tone === "complete" ? "✓" : step.tone === "active" ? "•" : "○"}</div>
                          <div className="progress-step__body">
                            <div className="progress-step__label">
                              <strong>{step.label}</strong>
                            </div>
                            <p>{step.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="panel-card crm-section-card">
                    <div className="panel-head">
                      <div>
                        <h3>Activity history</h3>
                        <p className="panel-subtitle">Recent engagement and follow-up notes.</p>
                      </div>
                    </div>
                    {selectedEmployee.activity?.length ? (
                      <div className="activity-list">
                        {selectedEmployee.activity.map((item, index) => (
                          <div className="activity-item" key={`${item.title}-${index}`}>
                            <span className={`activity-dot ${item.tone === "important" ? "dot-important" : ""}`} />
                            <div>
                              <strong>{item.title}</strong>
                              <p>{item.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">No recent activity yet.</div>
                    )}
                  </section>
                </div>

                <div className="crm-actions">
                  <button
                    className="secondary-btn"
                    disabled={actionLoading || !selectedEmployee.is_active}
                    onClick={() => handleAccountAction(selectedEmployee.id, "deactivate")}
                  >
                    {actionLoading ? "Updating..." : "Deactivate"}
                  </button>
                  <button
                    className="primary-btn"
                    disabled={actionLoading || selectedEmployee.is_active}
                    onClick={() => handleAccountAction(selectedEmployee.id, "reactivate")}
                  >
                    {actionLoading ? "Updating..." : "Reactivate"}
                  </button>
                </div>
              </>
            )}
        </Drawer>
      )}
    </div>
  );
}

export default Employees;
