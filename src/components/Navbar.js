import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("auth"); // Logout
    navigate("/");
  };

  return (
    <nav style={{ display: "flex", justifyContent: "space-between", padding: "10px", background: "#333", color: "white" }}>
      <h2>Valet Service</h2>
      <div>
        <Link to="/dashboard" style={{ color: "white", marginRight: "10px" }}>Dashboard</Link>
        <button onClick={handleLogout} style={{ background: "red", color: "white", border: "none", padding: "5px 10px" }}>
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
