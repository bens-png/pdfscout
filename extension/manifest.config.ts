// manifest.config.ts
import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "PlainSight",
  version: "0.0.3",
  action: { default_popup: "index.html" },
  permissions: ["storage", "activeTab", "scripting"],
  host_permissions: ["https://plainsight-proxy.pdfscout.workers.dev"], 
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/index.tsx"],
      run_at: "document_idle",
      all_frames: true
    }
  ]
});
