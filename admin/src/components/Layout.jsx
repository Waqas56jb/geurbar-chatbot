import { NavLink, Outlet } from "react-router-dom";

const NAV = [
  { to: "/", label: "Dashboard", icon: "📊", end: true },
  { to: "/products", label: "Producten", icon: "🌸" },
  { to: "/leads", label: "Leads", icon: "📥" },
  { to: "/conversations", label: "Gesprekken", icon: "💬" },
  { to: "/settings", label: "Instellingen", icon: "⚙️" },
];

export default function Layout({ onLogout }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          GEURBAR<span>Geurmaatje admin</span>
        </div>
        <nav>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? "active" : "")}>
              <span className="ic">{n.icon}</span>
              <span className="lbl">{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="logout" onClick={onLogout}>Uitloggen</button>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
