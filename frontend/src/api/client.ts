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
  headers: {
    "Cache-Control": "no-cache"
  }
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("finance.token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
