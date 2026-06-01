import { useEffect, useState } from "react";
import { api } from "../api.js";

const STATUSES = ["new", "contacted", "converted", "closed"];
function fmtDate(d) {
  return new Date(d).toLocaleString("nl-NL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function Leads() {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try { setItems(await api("/api/admin/leads")); } catch (e) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function setStatus(l, status) {
    await api(`/api/admin/leads/${l.id}`, { method: "PUT", body: { status } });
    setItems((arr) => arr.map((x) => (x.id === l.id ? { ...x, status } : x)));
  }
  async function remove(l) {
    if (!confirm("Lead verwijderen?")) return;
    await api(`/api/admin/leads/${l.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="page">
      <h1 className="page-title">Leads</h1>
      <p className="page-sub">Klanten die via Geurmaatje interesse toonden of contact wilden</p>
      {err && <div className="empty">⚠️ {err}</div>}
      {!items ? <div className="empty">Laden…</div> :
        items.length === 0 ? <div className="empty">Nog geen leads — de chatbot vult deze automatisch in.</div> : (
        <div className="panel no-pad">
          <table>
            <thead>
              <tr><th>Naam</th><th>E-mail</th><th>Telefoon</th><th>Interesse</th><th>Bericht</th><th>Status</th><th>Datum</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id}>
                  <td><b>{l.name || "—"}</b></td>
                  <td>{l.email || "—"}</td>
                  <td>{l.phone || "—"}</td>
                  <td>{l.interest || "—"}</td>
                  <td className="msg-cell">{l.message || ""}</td>
                  <td>
                    <select className={`status-select ${l.status}`} value={l.status} onChange={(e) => setStatus(l, e.target.value)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="muted">{fmtDate(l.createdAt)}</td>
                  <td><button className="btn sm danger" onClick={() => remove(l)}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
