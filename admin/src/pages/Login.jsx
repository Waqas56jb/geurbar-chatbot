import { useState } from "react";
import { login, auth } from "../api.js";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("admin@geurbar.nl");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await login(email, password);
      auth.set(data.token);
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="brand">GEURBAR<span>admin portal</span></div>
        <p className="login-sub">Beheer je chatbot, producten en leads</p>
        <label>E-mail</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>Wachtwoord</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
        <button className="btn-primary" disabled={busy}>{busy ? "Bezig…" : "Inloggen"}</button>
        {error && <div className="login-error">{error}</div>}
      </form>
    </div>
  );
}
