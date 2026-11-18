import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { systemClock } from "./core/clock";
import { randomSeed } from "./core/rng";
import { browserStore } from "./storage/history";
import { App } from "./ui/App";
import "./ui/theme.css";
import "./ui/app.css";

const root = document.getElementById("root");
if (root === null) throw new Error("missing #root element");

createRoot(root).render(
  <StrictMode>
    <App clock={systemClock} store={browserStore()} newSeed={randomSeed} />
  </StrictMode>,
);
