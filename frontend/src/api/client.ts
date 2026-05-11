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
  baseURL: resolveApiUrl()
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("finance.token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
