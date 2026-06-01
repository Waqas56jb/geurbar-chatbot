import { useEffect, useState } from "react";
import { api } from "../api.js";

function fmtDate(d) {
  return new Date(d).toLocaleString("nl-NL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function Dashboard() {
  const [a, setA] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/admin/analytics").then(setA).catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="page"><h1 className="page-title">Dashboard</h1><div className="empty">⚠️ {err}</div></div>;
  if (!a) return <div className="page"><div className="empty">Laden…</div></div>;

  return (
    <div className="page">
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">Realtime overzicht van je chatbot &amp; shop</p>

      <div className="stats">
        <Stat label="Actieve producten" value={a.products.active} sub={`van ${a.products.total}`} />
        <Stat label="Leads" value={a.leads.total} sub={`${a.leads.new} nieuw`} accent />
        <Stat label="Gesprekken" value={a.conversations.total} />
        <Stat label="Berichten" value={a.conversations.messages} />
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3>Meest gevraagde geuren</h3>
          {a.topInterests?.length ? (
            <table>
              <thead><tr><th>Product / geur</th><th>Aanvragen</th></tr></thead>
              <tbody>
                {a.topInterests.map((t, i) => (
                  <tr key={i}><td>{t.interest}</td><td>{t._count._all}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty sm">Nog geen data</div>}
        </div>

        <div className="panel">
          <h3>Recente leads</h3>
          {a.recentLeads?.length ? (
            <table>
              <thead><tr><th>Naam</th><th>Interesse</th><th>Datum</th></tr></thead>
              <tbody>
                {a.recentLeads.map((l) => (
                  <tr key={l.id}><td>{l.name || "—"}</td><td>{l.interest || "—"}</td><td className="muted">{fmtDate(l.createdAt)}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty sm">Nog geen leads</div>}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent }) {
  return (
    <div className={`stat${accent ? " accent" : ""}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}{sub && <span> {sub}</span>}</div>
    </div>
  );
}
