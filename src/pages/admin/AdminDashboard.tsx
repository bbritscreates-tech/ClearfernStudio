
import { Link } from "react-router-dom";
import "./Admin.css";

const dashboardSections = [
  {
    title: "Products",
    description: "Add, edit and manage your digital products.",
    path: "/admin/products",
    action: "Manage products",
  },
  {
    title: "Categories",
    description: "Organise products into shop categories.",
    path: "/admin/categories",
    action: "Manage categories",
  },
  {
    title: "Orders",
    description: "Review customer orders and payment statuses.",
    path: "/admin/orders",
    action: "View orders",
  },
  {
    title: "Reports",
    description: "Review sales and store performance.",
    path: "/admin/reports",
    action: "View reports",
  },
  {
    title: "Settings",
    description: "Manage your store configuration.",
    path: "/admin/settings",
    action: "Open settings",
  },
];

export default function AdminDashboard() {
  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-heading">
        <div>
          <p className="admin-eyebrow">OVERVIEW</p>
          <h1>Dashboard</h1>
          <p className="admin-muted">
            Welcome to your Clearfern Studio store administration.
          </p>
        </div>
      </div>

      <section className="admin-dashboard-welcome">
        <div>
          <p className="admin-eyebrow">YOUR STORE</p>
          <h2>Everything in one place.</h2>
          <p>
            Manage your digital products, organise your catalogue and keep
            track of customer orders from here.
          </p>
        </div>
        <Link to="/admin/products" className="admin-primary-link">
          Manage products
        </Link>
      </section>

      <section className="admin-dashboard-section">
        <h2>Store management</h2>
        <div className="admin-dashboard-grid">
          {dashboardSections.map((section) => (
            <article className="admin-dashboard-card" key={section.path}>
              <h3>{section.title}</h3>
              <p>{section.description}</p>
              <Link to={section.path}>{section.action} →</Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
