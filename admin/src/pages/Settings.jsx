import { useEffect, useState } from "react";
import { api } from "../api.js";

const FIELDS = [
  { key: "brandName", label: "Merknaam", hint: "bv. Geurbar — gebruikt in de bot en widget" },
  { key: "botName", label: "Botnaam", hint: "naam die de klant ziet, bv. Geurmaatje" },
  { key: "tagline", label: "Tagline", hint: "bv. Persoonlijke geuradviseur" },
  { key: "teaser", label: "Teaser-bubbel", hint: "korte tekst bij het bot-icoon" },
  { key: "welcome", label: "Welkomstbericht", type: "textarea" },
  { key: "personality", label: "Persoonlijkheid / toon", type: "textarea", hint: "Hoe de bot praat: charme, complimenten, stijl" },
  { key: "shopInfo", label: "Winkelinfo / kennisbank", type: "textarea", big: true, hint: "Levering, retour, prijzen, kortingen, contact — de bot beantwoordt beleid-vragen ALLEEN hieruit" },
  { key: "suggestions", label: "Snelle suggesties", type: "textarea", hint: "Scheid met | — getoond als klikbare knoppen in de chat" },
  { key: "launcherIcon", label: "Chat-knop icoon (emoji)", hint: "Laat leeg voor het standaard zwart-wit bot-logo. Of typ bv. 🧑 🤖 🌸" },
];

export default function Settings() {
  const [s, setS] = useState(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/api/admin/settings").then((data) => setS(data)).catch((e) => setErr(e.message));
  }, []);

  const set = (k) => (e) => { setS({ ...s, [k]: e.target.value }); setSaved(false); };

  async function save(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await api("/api/admin/settings", { method: "PUT", body: s });
      setSaved(true);
    } catch (e2) { setErr(e2.message); }
    finally { setBusy(false); }
  }

  if (err && !s) return <div className="page"><h1 className="page-title">Instellingen</h1><div className="empty">⚠️ {err}</div></div>;
  if (!s) return <div className="page"><div className="empty">Laden…</div></div>;

  return (
    <div className="page">
      <h1 className="page-title">Instellingen</h1>
      <p className="page-sub">Bepaal hoe Geurmaatje praat, wat hij weet en hoe hij eruitziet — alles zonder code</p>

      <form className="panel settings-form" onSubmit={save}>
        {FIELDS.map((f) => (
          <div className={`field full${f.big ? " big" : ""}`} key={f.key}>
            <label>{f.label}</label>
            {f.type === "textarea"
              ? <textarea rows={f.big ? 7 : 3} value={s[f.key] || ""} onChange={set(f.key)} />
              : <input value={s[f.key] || ""} onChange={set(f.key)} />}
            {f.hint && <div className="hint">{f.hint}</div>}
          </div>
        ))}

        <div className="color-row">
          <div className="field">
            <label>Hoofdkleur</label>
            <div className="color-pick">
              <input type="color" value={s.primaryColor || "#1a1a1a"} onChange={set("primaryColor")} />
              <input value={s.primaryColor || ""} onChange={set("primaryColor")} />
            </div>
          </div>
          <div className="field">
            <label>Accentkleur</label>
            <div className="color-pick">
              <input type="color" value={s.accentColor || "#c9a227"} onChange={set("accentColor")} />
              <input value={s.accentColor || ""} onChange={set("accentColor")} />
            </div>
          </div>
        </div>

        {err && <div className="login-error">{err}</div>}
        <div className="modal-actions">
          {saved && <span className="saved-badge">✓ Opgeslagen</span>}
          <button className="btn-gold" disabled={busy}>{busy ? "Opslaan…" : "Instellingen opslaan"}</button>
        </div>
      </form>
    </div>
  );
}
