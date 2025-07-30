import React from "react";
import ReactDOM from "react-dom/client";  // <-- Assicurati di importare ".client"
import { BrowserRouter } from "react-router-dom";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));  // <-- createRoot esiste solo in React 18+
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
