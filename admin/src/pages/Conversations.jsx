import { useEffect, useState } from "react";
import { api } from "../api.js";
import Modal from "../components/Modal.jsx";

function fmtDate(d) {
  return new Date(d).toLocaleString("nl-NL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function Conversations() {
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(null);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try { setItems(await api("/api/admin/conversations")); } catch (e) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function view(c) {
    const full = await api(`/api/admin/conversations/${c.id}`);
    setOpen(full);
  }
  async function remove(c) {
    if (!confirm("Gesprek verwijderen?")) return;
    await api(`/api/admin/conversations/${c.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="page">
      <h1 className="page-title">Gesprekken</h1>
      <p className="page-sub">Alle chats tussen bezoekers en Geurmaatje</p>
      {err && <div className="empty">⚠️ {err}</div>}
      {!items ? <div className="empty">Laden…</div> :
        items.length === 0 ? <div className="empty">Nog geen gesprekken</div> : (
        <div className="panel no-pad">
          <table>
            <thead><tr><th>Sessie</th><th>Berichten</th><th>Laatst actief</th><th></th></tr></thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.sessionId}</b></td>
                  <td>{c._count?.messages ?? "?"}</td>
                  <td className="muted">{fmtDate(c.updatedAt)}</td>
                  <td className="row-actions">
                    <button className="btn sm" onClick={() => view(c)}>Bekijk</button>
                    <button className="btn sm danger" onClick={() => remove(c)}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <Modal title={`Gesprek · ${open.sessionId}`} onClose={() => setOpen(null)}>
          <div className="transcript">
            {open.messages.filter((m) => m.role !== "system").map((m) => (
              <div key={m.id} className={`cmsg ${m.role}`}>{m.content}</div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
