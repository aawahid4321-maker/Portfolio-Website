import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./cursor.css";
import "./cursor.js";
import { initSmoothScroll } from "./smoothScroll";

initSmoothScroll();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
