import type { ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navigation = [
  { to: "/dashboard", label: "Overview", icon: "◫" },
  { to: "/groups", label: "Groups", icon: "◎" },
  { to: "/account", label: "Account", icon: "◉" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const name =
    typeof user?.user_metadata?.display_name === "string" &&
    user.user_metadata.display_name.trim()
      ? user.user_metadata.display_name.trim()
      : (user?.email?.split("@")[0] ?? "Player");
  const title =
    navigation.find((item) => item.to === location.pathname)?.label ??
    "Overview";

  async function handleSignOut() {
    await signOut();
    navigate("/", { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <NavLink to="/dashboard" className="brand" aria-label="Pickem home">
          <span className="brand-mark">
            <img
              className="brand-img"
              src="/soccer-ball.png"
              alt="Soccer Ball"
            />
          </span>
          <span>
            PICKEM<span className="brand-period">.</span>
          </span>
        </NavLink>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar-link${isActive ? " active" : ""}`
              }
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
              <span className="nav-arrow">↗</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink to="/account" className="sidebar-user">
            <span className="avatar">{name.charAt(0).toUpperCase()}</span>
            <span className="user-details">
              <strong>{name}</strong>
              <small>{user?.email}</small>
            </span>
          </NavLink>
          <button onClick={handleSignOut} className="sidebar-signout">
            Sign out <span aria-hidden="true">→</span>
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <span className="topbar-mobile-brand">
            <div className="flex gap-1.5">
              <img
                className="brand-img "
                src="/soccer-ball.png"
                alt="Soccer Ball"
              />
              PICKEM<span className="brand-period">.</span>
            </div>
          </span>
          <span className="topbar-title">/ {title}</span>
          <NavLink
            to="/account"
            className="topbar-account"
            aria-label="Edit account"
          >
            <span>{name}</span>
            <span className="avatar small">{name.charAt(0).toUpperCase()}</span>
          </NavLink>
        </header>
        <main className="app-content">{children}</main>
      </div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `mobile-link${isActive ? " active" : ""}`
            }
          >
            <span className="mobile-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
