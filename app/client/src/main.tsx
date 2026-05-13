import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/app";

import "highlight.js/styles/github-dark.css";

import "@/shared/styles/main.scss";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
