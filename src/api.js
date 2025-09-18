// src/api.js
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api.italinks.com/valet";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // <<< manda e legge il cookie "vsid" HttpOnly
  headers: { "Content-Type": "application/json" },
});

// Log solo in dev
if (import.meta.env.DEV) {
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
