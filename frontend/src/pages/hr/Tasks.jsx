import { useEffect, useState } from "react";
import api from "../../api/api";
import { DataTable, EmptyState, PageHeader, Skeleton, StatusBadge } from "../../components/ui";
import { useToast } from "../../components/ToastProvider";

function Tasks() {
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ employee_id: "", title: "", description: "", due_date: "", priority: "MEDIUM", action_url: "" });
  const showToast = useToast();

  const load = async () => {
    try {
      setLoading(true);
      const [employeeResponse, taskResponse] = await Promise.all([api.get("/employees"), api.get("/tasks")]);
      setEmployees(employeeResponse.data || []);
      setTasks(taskResponse.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load tasks.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true); setError("");
      await api.post("/tasks", { ...form, employee_id: Number(form.employee_id), due_date: form.due_date || null, description: form.description || null, action_url: form.action_url || null });
      setForm({ employee_id: "", title: "", description: "", due_date: "", priority: "MEDIUM", action_url: "" });
      showToast("Task assigned and employee notified.");
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to assign the task.");
    } finally { setSaving(false); }
  };

  const sendReminders = async () => {
    try {
      setReminding(true);
      const { data } = await api.post("/tasks/reminders/run");
      showToast(data.reminders_sent ? `${data.reminders_sent} reminder${data.reminders_sent === 1 ? "" : "s"} sent.` : "No reminders are due today.");
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to run task reminders.");
    } finally { setReminding(false); }
  };

  return <div className="page-shell">
    <PageHeader eyebrow="Employee operations" title="Tasks and activities" description="Assign clear next steps and due dates so employees always know what to do next." actions={<button type="button" className="secondary-btn" onClick={sendReminders} disabled={reminding}>{reminding ? "Sending…" : "Send due reminders"}</button>} />
    {error && <div className="alert alert-error">{error}</div>}
    <section className="panel-card">
      <div className="panel-head"><div><h3>Assign a task</h3><p className="panel-subtitle">The employee receives an in-app notification immediately.</p></div></div>
      <form className="crm-form" onSubmit={submit}><div className="crm-form__grid">
        <label><span>Employee</span><select value={form.employee_id} onChange={(event) => setForm({ ...form, employee_id: event.target.value })} required><option value="">Select employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name} · {employee.employee_code}</option>)}</select></label>
        <label><span>Task title</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
        <label><span>Due date</span><input type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} /></label>
        <label><span>Priority</span><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></label>
        <label><span>Action link (optional)</span><input value={form.action_url} onChange={(event) => setForm({ ...form, action_url: event.target.value })} placeholder="/employee/documents" /></label>
        <label><span>Description (optional)</span><input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
      </div><button className="primary-btn" type="submit" disabled={saving}>{saving ? "Assigning…" : "Assign task"}</button></form>
    </section>
    <section className="panel-card"><div className="panel-head"><div><h3>Assigned tasks</h3><p className="panel-subtitle">Track outstanding work and completion status.</p></div></div>
      {loading ? <Skeleton lines={4} /> : tasks.length ? <DataTable rows={tasks} getRowKey={(task) => task.id} columns={[{ key: "employee", label: "Employee", render: (task) => task.employee_name }, { key: "title", label: "Task", render: (task) => <><strong>{task.title}</strong>{task.description && <small className="table-detail">{task.description}</small>}</> }, { key: "due", label: "Due", render: (task) => task.due_date ? `${task.due_date} (${task.days_until_due < 0 ? "overdue" : `${task.days_until_due} days`})` : "—" }, { key: "priority", label: "Priority", render: (task) => <StatusBadge status={task.priority}>{task.priority}</StatusBadge> }, { key: "status", label: "Status", render: (task) => <StatusBadge status={task.status}>{task.status}</StatusBadge> }]} /> : <EmptyState title="No tasks assigned" description="Assign the first next step for an employee." />}
    </section>
  </div>;
}

export default Tasks;
