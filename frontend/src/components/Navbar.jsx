import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DropIcon from "./DropIcon";
import ThemeToggle from "./ThemeToggle";

// Left sidebar shown after login
export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const links = [
    ["/dashboard", "Dashboard"],
    ["/stock", "Blood stock"],
    ["/requests", "Requests"],
  ];
  if (user.role === "admin" || user.role === "hospital") links.push(["/matcher", "Find donors"]);
  if (user.role === "admin") {
    links.push(["/donors", "Donors"], ["/reports", "Reports"], ["/admin", "Admin"]);
  }
  if (user.role === "donor") links.push(["/donors", "My donor profile"]);

  return (
    <aside className="sidebar">
      <Link to="/dashboard" className="side-brand">
        <DropIcon />
        <span>Blood Management System</span>
      </Link>

      <nav className="side-nav" aria-label="Main">
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : "")}>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="side-user">
        <div>
          <strong>{user.name}</strong>
          <span>{user.role}</span>
        </div>
        <ThemeToggle />
        <button className="ghost" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </aside>
  );
}
