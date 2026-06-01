import { useEffect, useMemo, useRef, useState } from "react";
import { api, uploadFile } from "../api.js";
import Modal from "../components/Modal.jsx";

const EMPTY = {
  code: "", name: "", category: "heren", gender: "", inspiredBy: "", realName: "",
  type: "", intensity: "", season: "", notes: "", occasions: "",
  priceRegular: "", priceSale: "", content: "", description: "", active: true, images: [],
};

export default function Products() {
  const [items, setItems] = useState(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null);
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
              <tr><th>Foto</th><th>Code</th><th>Geïnspireerd door</th><th>Categorie</th><th>Prijs</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.images?.[0]
                      ? <img className="thumb" src={p.images[0]} alt={p.code} />
                      : <div className="thumb ph">🌸</div>}
                  </td>
                  <td><b>{p.code}</b></td>
                  <td>{p.inspiredBy}{p.realName && <div className="priv">🔒 {p.realName}</div>}</td>
                  <td><span className="badge cat">{p.category}</span>{p.gender ? ` ${p.gender}` : ""}</td>
                  <td>{p.priceSale ? <><s className="muted">€{p.priceRegular?.toFixed(2)}</s> €{p.priceSale.toFixed(2)}</> : (p.priceRegular ? `€${p.priceRegular.toFixed(2)}` : "—")}</td>
                  <td>{p.active ? <span className="badge ok">actief</span> : <span className="badge off">uit</span>}</td>
                  <td className="row-actions">
                    <button className="btn sm" onClick={() => setPreview(p)}>Bekijk</button>
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
      {preview && <PreviewModal product={preview} onClose={() => setPreview(null)} />}
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

function ImageUploader({ images, setImages }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onPick(e) {
    const files = [...e.target.files];
    e.target.value = "";
    if (!files.length) return;
    const room = 4 - images.length;
    if (room <= 0) return;
    setBusy(true); setErr("");
    try {
      const next = [...images];
      for (const file of files.slice(0, room)) {
        const { url } = await uploadFile(file);
        next.push(url);
      }
      setImages(next);
    } catch (e2) { setErr(e2.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="field full">
      <label>Foto's (max 4)</label>
      <div className="img-grid">
        {images.map((url, i) => (
          <div className="img-tile" key={i}>
            <img src={url} alt={`foto ${i + 1}`} />
            <button type="button" className="img-x" onClick={() => setImages(images.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
        {images.length < 4 && (
          <button type="button" className="img-add" onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? "Uploaden…" : "＋ Foto"}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={onPick} />
      {err && <div className="login-error">{err}</div>}
      <div className="hint">JPG/PNG/WebP, max 5MB per foto. Opgeslagen in Supabase Storage.</div>
    </div>
  );
}

function ProductModal({ product, onClose, onSaved }) {
  const [f, setF] = useState({ ...EMPTY, ...product, gender: product.gender || "", images: product.images || [] });
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
      images: f.images || [],
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
          <ImageUploader images={f.images} setImages={(imgs) => setF({ ...f, images: imgs })} />
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

function PreviewModal({ product: p, onClose }) {
  const [active, setActive] = useState(0);
  const imgs = p.images?.length ? p.images : [];
  return (
    <Modal title={`${p.name}`} onClose={onClose} wide>
      <div className="preview">
        <div className="preview-gallery">
          <div className="preview-main">
            {imgs[active] ? <img src={imgs[active]} alt={p.code} /> : <div className="preview-ph">🌸</div>}
          </div>
          {imgs.length > 1 && (
            <div className="preview-thumbs">
              {imgs.map((u, i) => (
                <img key={i} src={u} className={i === active ? "on" : ""} onClick={() => setActive(i)} alt={`${i}`} />
              ))}
            </div>
          )}
        </div>
        <div className="preview-info">
          <div className="pi-code">{p.code} {p.active ? <span className="badge ok">actief</span> : <span className="badge off">uit</span>}</div>
          <h2>Geïnspireerd door {p.inspiredBy}</h2>
          {p.realName && <div className="priv">🔒 echte naam: {p.realName}</div>}
          <div className="pi-price">{p.priceSale ? <><s className="muted">€{p.priceRegular?.toFixed(2)}</s> €{p.priceSale.toFixed(2)}</> : (p.priceRegular ? `€${p.priceRegular.toFixed(2)}` : "")}</div>
          <table className="pi-spec"><tbody>
            {p.category && <tr><td>Categorie</td><td>{p.category}{p.gender ? ` · ${p.gender}` : ""}</td></tr>}
            {p.type && <tr><td>Type</td><td>{p.type}</td></tr>}
            {p.intensity && <tr><td>Intensiteit</td><td>{p.intensity}</td></tr>}
            {p.season && <tr><td>Seizoen</td><td>{p.season}</td></tr>}
            {p.notes && <tr><td>Noten</td><td>{p.notes}</td></tr>}
            {p.occasions && <tr><td>Gelegenheid</td><td>{p.occasions}</td></tr>}
            {p.content && <tr><td>Inhoud</td><td>{p.content}</td></tr>}
          </tbody></table>
          {p.description && <p className="pi-desc">{p.description}</p>}
        </div>
      </div>
    </Modal>
  );
}
