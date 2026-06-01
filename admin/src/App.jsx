import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { api, auth, setUnauthorizedHandler } from "./api.js";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Products from "./pages/Products.jsx";
import Leads from "./pages/Leads.jsx";
import Conversations from "./pages/Conversations.jsx";
import Settings from "./pages/Settings.jsx";

export default function App() {
  const [authed, setAuthed] = useState(!!auth.token);
  const [checking, setChecking] = useState(!!auth.token);
  const navigate = useNavigate();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthed(false);
      navigate("/login");
    });
  }, [navigate]);

  useEffect(() => {
    if (auth.token) {
      api("/api/auth/me")
        .then(() => setAuthed(true))
        .catch(() => setAuthed(false))
        .finally(() => setChecking(false));
    }
  }, []);

  function handleLogin() {
    setAuthed(true);
    navigate("/");
  }
  function handleLogout() {
    auth.clear();
    setAuthed(false);
    navigate("/login");
  }

  if (checking) return <div className="boot">Laden…</div>;

  if (!authed) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout onLogout={handleLogout} />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="leads" element={<Leads />} />
        <Route path="conversations" element={<Conversations />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
