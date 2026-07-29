import { useNavigate } from "react-router-dom";

function HRDashboard() {
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
      <h1>HR Dashboard</h1>

      <p>Logged in as: {user.email}</p>
      <p>Role: {user.role}</p>

      <button onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}

export default HRDashboard;