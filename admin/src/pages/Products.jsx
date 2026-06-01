import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import Modal from "../components/Modal.jsx";

const EMPTY = {
  code: "", name: "", category: "heren", gender: "", inspiredBy: "", realName: "",
  type: "", intensity: "", season: "", notes: "", occasions: "",
  priceRegular: "", priceSale: "", content: "", description: "", active: true,
};

export default function Products() {
  const [items, setItems] = useState(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null); // product object or EMPTY
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try { setItems(await api("/api/admin/products")); }
    catch (e) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    const s = q.toLowerCase();
    return items.filter((p) =>
      [p.code, p.name, p.inspiredBy, p.notes, p.category, p.gender, p.type]
        .filter(Boolean).join(" ").toLowerCase().includes(s)
    );
  }, [items, q]);

  async function remove(p) {
    if (!confirm(`Product ${p.code} verwijderen?`)) return;
    await api(`/api/admin/products/${p.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Producten</h1>
          <p className="page-sub">De chatbot adviseert alléén actieve producten uit deze lijst</p>
        </div>
        <button className="btn-gold" onClick={() => setEditing({ ...EMPTY })}>+ Nieuw product</button>
      </div>

      <div className="toolbar">
        <input className="search" placeholder="Zoek op code, geur, noten, categorie…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="muted">{filtered.length} producten</span>
      </div>

      {err && <div className="empty">⚠️ {err}</div>}
      {!items ? <div className="empty">Laden…</div> : (
        <div className="panel no-pad">
          <table>
            <thead>
              <tr><th>Code</th><th>Geïnspireerd door</th><th>Categorie</th><th>Intensiteit</th><th>Prijs</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.code}</b></td>
                  <td>{p.inspiredBy}{p.realName && <div className="priv">🔒 {p.realName}</div>}</td>
                  <td><span className="badge cat">{p.category}</span>{p.gender ? ` ${p.gender}` : ""}</td>
                  <td>{p.intensity || "—"}</td>
                  <td>{p.priceSale ? <><s className="muted">€{p.priceRegular?.toFixed(2)}</s> €{p.priceSale.toFixed(2)}</> : (p.priceRegular ? `€${p.priceRegular.toFixed(2)}` : "—")}</td>
                  <td>{p.active ? <span className="badge ok">actief</span> : <span className="badge off">uit</span>}</td>
                  <td className="row-actions">
                    <button className="btn sm" onClick={() => setEditing(p)}>Bewerk</button>
                    <button className="btn sm danger" onClick={() => remove(p)}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProductModal product={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
    </div>
  );
}

function Field({ label, hint, full, children }) {
  return (
    <div className={`field${full ? " full" : ""}`}>
      <label>{label}</label>
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

function ProductModal({ product, onClose, onSaved }) {
  const [f, setF] = useState({ ...EMPTY, ...product, gender: product.gender || "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const body = {
      ...f,
      gender: f.gender || null,
      priceRegular: f.priceRegular === "" ? null : Number(f.priceRegular),
      priceSale: f.priceSale === "" ? null : Number(f.priceSale),
      active: !!f.active,
    };
    try {
      if (product.id) await api(`/api/admin/products/${product.id}`, { method: "PUT", body });
      else await api("/api/admin/products", { method: "POST", body });
      onSaved();
    } catch (e2) { setErr(e2.message); setBusy(false); }
  }

  return (
    <Modal title={product.id ? `Product bewerken — ${product.code}` : "Nieuw product"} onClose={onClose} wide>
      <form onSubmit={save}>
        <div className="form-grid">
          <Field label="Code" hint="bv. No.078"><input value={f.code} onChange={set("code")} required /></Field>
          <Field label="Naam" hint="bv. Geurbar No.078"><input value={f.name} onChange={set("name")} required /></Field>
          <Field label="Categorie">
            <select value={f.category} onChange={set("category")}>
              <option value="heren">heren</option><option value="dames">dames</option>
              <option value="roomspray">roomspray</option><option value="autoparfum">autoparfum</option>
            </select>
          </Field>
          <Field label="Geslacht">
            <select value={f.gender} onChange={set("gender")}>
              <option value="">—</option><option>Mannelijk</option><option>Vrouwelijk</option>
            </select>
          </Field>
          <Field label="Geïnspireerd door (publiek)"><input value={f.inspiredBy} onChange={set("inspiredBy")} required /></Field>
          <Field label="Echte merknaam 🔒 (privé)" hint="Alleen voor de bot — nooit zichtbaar op de site"><input value={f.realName || ""} onChange={set("realName")} /></Field>
          <Field label="Type" full hint="bv. Warm, zoet en kruidig"><input value={f.type || ""} onChange={set("type")} /></Field>
          <Field label="Intensiteit"><input value={f.intensity || ""} onChange={set("intensity")} placeholder="Medium / Sterk…" /></Field>
          <Field label="Seizoen"><input value={f.season || ""} onChange={set("season")} placeholder="Lente/zomer…" /></Field>
          <Field label="Noten" full hint="komma-gescheiden"><input value={f.notes || ""} onChange={set("notes")} /></Field>
          <Field label="Gelegenheid" full><input value={f.occasions || ""} onChange={set("occasions")} /></Field>
          <Field label="Prijs normaal (€)"><input type="number" step="0.01" value={f.priceRegular ?? ""} onChange={set("priceRegular")} /></Field>
          <Field label="Prijs aanbieding (€)"><input type="number" step="0.01" value={f.priceSale ?? ""} onChange={set("priceSale")} /></Field>
          <Field label="Inhoud"><input value={f.content || ""} onChange={set("content")} placeholder="50ml / 200ml…" /></Field>
          <Field label="Actief">
            <select value={f.active ? "ja" : "nee"} onChange={(e) => setF({ ...f, active: e.target.value === "ja" })}>
              <option value="ja">ja</option><option value="nee">nee</option>
            </select>
          </Field>
          <Field label="Beschrijving" full><textarea rows="2" value={f.description || ""} onChange={set("description")} /></Field>
        </div>
        {err && <div className="login-error">{err}</div>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>Annuleren</button>
          <button type="submit" className="btn-gold" disabled={busy}>{busy ? "Opslaan…" : "Opslaan"}</button>
        </div>
      </form>
    </Modal>
  );
}
