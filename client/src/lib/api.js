const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

export function getStoredSession() {
  try {
    const raw = localStorage.getItem("hcmc_session");
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
}

export function setStoredSession(session) {
  if (!session) localStorage.removeItem("hcmc_session");
  else localStorage.setItem("hcmc_session", JSON.stringify(session));
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

export function apiGet(path, token) {
  return request(path, { method: "GET", token });
}

export function apiPost(path, body, token) {
  return request(path, { method: "POST", token, body: JSON.stringify(body) });
}

export function apiPut(path, body, token) {
  return request(path, { method: "PUT", token, body: JSON.stringify(body) });
}
