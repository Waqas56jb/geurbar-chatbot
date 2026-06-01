import { useEffect, useRef, useState } from "react";
import { fetchSettings, sendMessage } from "./api.js";

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

export default function App() {
  const [cfg, setCfg] = useState(DEFAULTS);
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchSettings()
      .then((s) => setCfg({ ...DEFAULTS, ...s }))
      .catch(() => {});
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
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
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
    <div className="stage">
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
          <span className="confidential">privé</span>
        </header>

        {!started ? (
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
                <div key={i} className={`bubble ${m.role}`}>
                  <span dangerouslySetInnerHTML={{ __html: renderText(m.content) }} />
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
