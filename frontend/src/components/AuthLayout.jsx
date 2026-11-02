import DropIcon from "./DropIcon";
import ThemeToggle from "./ThemeToggle";

// Shared layout for the Login and Register pages
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-layout">
      <aside className="auth-aside">
        <div className="auth-brand">
          <DropIcon size={30} />
          <span>Blood Management System</span>
        </div>
        <div className="auth-pitch">
          <h1>Know what's in stock. Find who can give.</h1>
          <p>
            Track blood units, manage donors and respond to urgent requests from one place.
          </p>
        </div>
      </aside>
      <div className="auth-main">
        <div className="auth-theme">
          <ThemeToggle />
        </div>
        <div className="auth-card">
          <h2>{title}</h2>
          <p className="auth-sub">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
