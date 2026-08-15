// Central place for talking to the backend.
// If your server ever runs on a different port, change it here only.
const API_BASE = "http://localhost:5050/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export function registerUser(form) {
  return request("/users/register", {
    method: "POST",
    body: JSON.stringify(form),
  });
}

export function fetchJobs({ skill, city, workerId } = {}) {
  const params = new URLSearchParams();
  if (skill) params.set("skill", skill);
  if (city) params.set("city", city);
  if (workerId) params.set("worker_id", workerId);
  const query = params.toString() ? `?${params.toString()}` : "";
  return request(`/jobs${query}`, { method: "GET" });
}

export function loginUser({ phone, password }) {
  return request("/users/login", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });
}

export function fetchUserProfile(id) {
  return request(`/users/${id}`, { method: "GET" });
}