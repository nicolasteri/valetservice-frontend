import axios from "axios";

const RAW_BASE = process.env.REACT_APP_API_BASE || "/valet";
// Normalizza con "/" finale per sicurezza
const API_BASE = RAW_BASE.endsWith("/") ? RAW_BASE : RAW_BASE + "/";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Log solo in sviluppo
if (process.env.NODE_ENV !== "production") {
  api.interceptors.response.use(
    (r) => r,
    (err) => {
      console.error(
        "API error:",
        err?.response?.status,
        err?.response?.data || err?.message
      );
      return Promise.reject(err);
    }
  );
}

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (process.env.NODE_ENV !== "production") {
      const s = err?.response?.status;
      const url = err?.config?.url;
      // mostriamo il body solo in dev
      console.warn("[API ERR]", s, url, err?.response?.data);
    }
    return Promise.reject(err);
  }
);
