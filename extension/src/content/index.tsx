/* @refresh skip */
// import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const HOST_ID = "plainsight-root";

(function mount() {
  // if already injected, do nothing
  let host = document.getElementById(HOST_ID) as HTMLElement | null;
  if (host) {
    console.log("[plainsight] already mounted");
    return;
  }

  host = document.createElement("div");
  host.id = HOST_ID;
  Object.assign(host.style, {
    position: "fixed",
    inset: "0",
    pointerEvents: "none",
    zIndex: "2147483647",
  });
  (document.body || document.documentElement).appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  // small debug label so you can see it mounted (remove later)
  const dbg = document.createElement("div");
  Object.assign(dbg.style, {
    position: "fixed",
    top: "8px",
    right: "8px",
    font: "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    color: "#666",
    background: "rgba(255,255,255,.9)",
    border: "1px solid rgba(0,0,0,.1)",
    borderRadius: "8px",
    padding: "2px 6px",
    pointerEvents: "auto",
  });
  dbg.textContent = "PlainSight loaded";
  shadow.appendChild(dbg);

  const mountPoint = document.createElement("div");
  shadow.appendChild(mountPoint);
  createRoot(mountPoint).render(<App />);
})();
