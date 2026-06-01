const API = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");

const SID_KEY = "geurmaatje_sid";
export function getSessionId() {
  let sid = localStorage.getItem(SID_KEY);
  if (!sid) {
    sid = "web_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(SID_KEY, sid);
  }
  return sid;
}

export async function fetchSettings() {
  const res = await fetch(`${API}/api/settings`);
  if (!res.ok) throw new Error("settings");
  return res.json();
}

export async function fetchHistory() {
  const sid = getSessionId();
  const res = await fetch(`${API}/api/chat/history?sessionId=${encodeURIComponent(sid)}`);
  if (!res.ok) throw new Error("history");
  return res.json();
}

export async function sendMessage(message) {
  const res = await fetch(`${API}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: getSessionId(), message }),
  });
  if (!res.ok) throw new Error("chat");
  return res.json();
}
