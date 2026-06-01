import { useEffect, useRef, useState } from "react";
import { fetchHistory, fetchSettings, sendMessage } from "./api.js";

// Minimal, safe markdown -> HTML for **bold**, *italic*, line breaks.
function renderText(text) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}

const DEFAULTS = {
  brandName: "Geurbar",
  botName: "Geurmaatje",
  tagline: "Persoonlijke geuradviseur",
  welcome: "Welkom! Samen vinden we jouw perfecte geur.",
  suggestions: [],
  primaryColor: "#1a1a1a",
  accentColor: "#c9a227",
};

const IS_EMBED = typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("embed") === "1";

export default function App() {
  const [cfg, setCfg] = useState(DEFAULTS);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    Promise.all([fetchSettings(), fetchHistory()])
      .then(([s, h]) => {
        setCfg({ ...DEFAULTS, ...s });
        if (h.messages?.length) {
          setMessages(h.messages);
          setStarted(true);
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--brand-dark", cfg.primaryColor || "#1a1a1a");
    document.documentElement.style.setProperty("--brand-gold", cfg.accentColor || "#c9a227");
    document.title = `${cfg.botName} — ${cfg.brandName}`;
  }, [cfg]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, typing]);

  function start() {
    setStarted(true);
    setMessages([{ role: "assistant", content: cfg.welcome }]);
    setTimeout(() => inputRef.current?.focus(), 200);
  }

  async function submit(text) {
    const msg = (text ?? input).trim();
    if (!msg || typing) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setTyping(true);
    try {
      const res = await sendMessage(msg);
      setMessages((m) => [...m, { role: "assistant", content: res.reply, products: res.products || [] }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Oeps, ik kan even geen verbinding maken. Probeer het zo nog eens. 🙏" },
      ]);
    } finally {
      setTyping(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  const initial = (cfg.brandName || "G").charAt(0).toUpperCase();

  return (
    <div className={`stage${IS_EMBED ? " embed" : ""}`}>
      <div className="card">
        {/* Header */}
        <header className="card-head">
          <div className="logo-sm">{initial}</div>
          <div className="head-meta">
            <h1>{cfg.brandName}</h1>
            <span className="status">
              <i className="dot" /> {cfg.tagline} · online
            </span>
          </div>
          {IS_EMBED ? (
            <button className="head-close" aria-label="Sluiten" onClick={() => window.parent?.postMessage("geurmaatje:close", "*")}>×</button>
          ) : (
            <span className="confidential">privé</span>
          )}
        </header>

        {!ready ? (
          <div className="welcome">
            <div className="logo-lg">{initial}</div>
            <p className="welcome-sub">Laden…</p>
          </div>
        ) : !started ? (
          /* Welcome screen */
          <div className="welcome">
            <div className="logo-lg">{initial}</div>
            <h2 className="serif">
              Welkom bij
              <br />
              {cfg.brandName}
            </h2>
            <p className="welcome-sub">{cfg.welcome}</p>
            <button className="cta" onClick={start}>
              ✨ Start het gesprek
            </button>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="body" ref={bodyRef}>
              {messages.map((m, i) => (
                <div key={i} className="msg-row">
                  <div className={`bubble ${m.role}`}>
                    <span dangerouslySetInnerHTML={{ __html: renderText(m.content) }} />
                  </div>
                  {m.role === "assistant" && m.products?.length > 0 && (
                    <div className="product-cards">
                      {m.products.map((p) => (
                        <ProductCard key={p.id} p={p} />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {messages.length === 1 && cfg.suggestions?.length > 0 && (
                <div className="suggestions">
                  {cfg.suggestions.map((s, i) => (
                    <button key={i} className="chip" onClick={() => submit(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {typing && (
                <div className="bubble assistant typing">
                  <span /> <span /> <span />
                </div>
              )}
            </div>

            {/* Composer */}
            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Schrijf je bericht..."
              />
              <button type="submit" disabled={!input.trim() || typing} aria-label="Verstuur">
                <svg viewBox="0 0 24 24">
                  <path d="M3 20l18-8L3 4v6l12 2-12 2v6z" />
                </svg>
              </button>
            </form>
          </>
        )}

        <footer className="card-foot">
          Powered by {cfg.botName} · AI-adviseur 24/7
        </footer>
      </div>
    </div>
  );
}

function ProductCard({ p }) {
  const [idx, setIdx] = useState(0);
  const imgs = p.images?.length ? p.images : [];
  const price = p.priceSale
    ? `€${p.priceSale.toFixed(2)}`
    : p.priceRegular
    ? `€${p.priceRegular.toFixed(2)}`
    : "";
  const Wrapper = p.url ? "a" : "div";
  return (
    <Wrapper className="pcard" {...(p.url ? { href: p.url, target: "_blank", rel: "noreferrer" } : {})}>
      <div className="pcard-img" onMouseEnter={() => imgs.length > 1 && setIdx(1)} onMouseLeave={() => setIdx(0)}>
        {imgs[idx] ? <img src={imgs[idx]} alt={p.code} /> : <div className="pcard-ph">🌸</div>}
        {p.priceSale && p.priceRegular && <span className="pcard-sale">sale</span>}
      </div>
      <div className="pcard-body">
        <div className="pcard-code">{p.code}</div>
        <div className="pcard-insp">geïnspireerd door {p.inspiredBy}</div>
        {p.notes && <div className="pcard-notes">{p.notes.split(",").slice(0, 3).join(" · ")}</div>}
        <div className="pcard-foot">
          <span className="pcard-price">
            {p.priceSale && p.priceRegular && <s>€{p.priceRegular.toFixed(2)}</s>} {price}
          </span>
          {p.url && <span className="pcard-cta">Bekijk →</span>}
        </div>
      </div>
    </Wrapper>
  );
}
