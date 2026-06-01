import axios from "axios";

function resolveApiUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  const { protocol, hostname } = window.location;
  const backendHost = hostname || "localhost";
  return `${protocol}//${backendHost}:3333/api`;
}

export const api = axios.create({
  baseURL: resolveApiUrl(),
  withCredentials: true,
  headers: {
    "Cache-Control": "no-cache"
  }
});

api.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase() ?? "GET";
  const csrfToken = sessionStorage.getItem("finance.csrf");

  if (!["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken) {
    config.headers["X-CSRF-Token"] = csrfToken;
  }

  return config;
});
