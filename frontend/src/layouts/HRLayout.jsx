import { NavLink, Outlet, useNavigate } from "react-router-dom";

function HRLayout() {
  const navigate = useNavigate();

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("challenge_token");

    navigate("/login", { replace: true });
  };

  return (
    <div>
      <aside>
        <h2>HR DMS</h2>

        <p>{user.email}</p>

        <nav>
          <div>
            <NavLink to="/hr" end>
              Dashboard
            </NavLink>
          </div>

          <div>
            <NavLink to="/hr/employees">
              Employees
            </NavLink>
          </div>

          <div>
            <NavLink to="/hr/documents">
              Pending Documents
            </NavLink>
          </div>

          <div>
            <NavLink to="/hr/document-settings">
              Document Settings
            </NavLink>
          </div>

          <div>
            <NavLink to="/hr/audit">
              Audit Logs
            </NavLink>
          </div>

          <div>
            <NavLink to="/hr/notifications">
              Notifications
            </NavLink>
          </div>
        </nav>

        <button onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default HRLayout;