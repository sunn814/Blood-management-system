import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        🩸 Blood Management System
      </Link>
      {user && (
        <div className="nav-links">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/stock">Blood Stock</Link>
          <Link to="/requests">Requests</Link>
          {user.role === "admin" && (
            <>
              <Link to="/donors">Donors</Link>
              <Link to="/reports">Reports</Link>
            </>
          )}
          <span className="user-tag">
            {user.name} ({user.role})
          </span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      )}
    </nav>
  );
}
