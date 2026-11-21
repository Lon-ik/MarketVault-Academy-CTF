const BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function emitFlags(payload) {
  if (!payload || typeof payload !== "object") return;
  const found = [];
  if (typeof payload.flag === "string" && payload.flag.startsWith("MV{")) {
    found.push(payload.flag);
  }
  if (Array.isArray(payload.flags)) {
    for (const flag of payload.flags) {
      if (typeof flag === "string" && flag.startsWith("MV{")) found.push(flag);
    }
  }
  for (const flag of found) {
    window.dispatchEvent(new CustomEvent("mv:flag", { detail: flag }));
  }
}

export async function request(path, options = {}) {
  const token = localStorage.getItem("mv_token");
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (token && options.auth !== false) {
    headers.Authorization = "Bearer " + token;
  }
  const response = await fetch(BASE + path, {
    credentials: "include",
    ...options,
    headers,
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  emitFlags(payload);
  if (!response.ok) {
    const message =
      (payload && (payload.error || payload.detail)) || "Запрос не выполнен";
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export function assetUrl(path) {
  return BASE + path;
}