const API = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");
const TOKEN_KEY = "geurbar_admin_token";

export const auth = {
  get token() { return localStorage.getItem(TOKEN_KEY); },
  set(token) { localStorage.setItem(TOKEN_KEY, token); },
  clear() { localStorage.removeItem(TOKEN_KEY); },
};

let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) { onUnauthorized = fn; }

export async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    auth.clear();
    onUnauthorized();
    throw new Error("Niet ingelogd");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Fout ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

export function login(email, password) {
  return api("/api/auth/login", { method: "POST", body: { email, password } });
}

// Upload one image file -> returns { url }. Uses multipart (no JSON header).
export async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const headers = {};
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  const res = await fetch(`${API}/api/admin/upload`, { method: "POST", headers, body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Upload mislukt");
  }
  return res.json();
}
