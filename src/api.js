// src/api.js
import axios from "axios";

// CRA: le env si leggono da process.env.REACT_APP_*
const API_BASE = process.env.REACT_APP_API_BASE || "/valet"; // default per sviluppo locale

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // invia/legge il cookie HttpOnly "vsid"
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
