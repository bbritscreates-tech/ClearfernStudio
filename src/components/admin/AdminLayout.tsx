
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./AdminLayout.css";

const navigation = [
  { label: "Dashboard", path: "/admin", icon: "▦", end: true },
  { label: "Products", path: "/admin/products", icon: "◇" },
  { label: "Categories", path: "/admin/categories", icon: "▤" },
  { label: "Orders", path: "/admin/orders", icon: "▣" },
  { label: "Reports", path: "/admin/reports", icon: "▥" },
  { label: "Settings", path: "/admin/settings", icon: "⚙" },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      window.alert("Unable to sign out. Please try again.");
      return;
    }

    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <NavLink to="/admin" className="admin-sidebar-brand">
          <span className="admin-brand-mark">C</span>
          <span>
            <strong>Clearfern</strong>
            <small>STUDIO ADMIN</small>
          </span>
        </NavLink>

        <p className="admin-nav-heading">WORKSPACE</p>

        <nav className="admin-navigation" aria-label="Admin navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `admin-nav-link${isActive ? " active" : ""}`
              }
            >
              <span className="admin-nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-sidebar-note">
            <span className="admin-status-dot" />
            <span>Store administration</span>
          </div>

          <button
            type="button"
            className="admin-signout-button"
            onClick={handleSignOut}
          >
            <span aria-hidden="true">↪</span>
            Sign out
          </button>

          <NavLink to="/" className="admin-store-link">
            ← View storefront
          </NavLink>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="admin-topbar-label">CLEARFERN STUDIO</p>
            <p className="admin-topbar-title">Store management</p>
          </div>
          <span className="admin-account-label">Administrator</span>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
