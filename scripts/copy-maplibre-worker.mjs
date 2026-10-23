// maplibre-gl 6 loads its web worker from a file next to its own module, which bundlers move.
// Serve a copy from public/ instead (see lib/map-style.ts). Runs on every npm install, so the copy
// always matches the installed version.
import { copyFileSync } from "node:fs";

copyFileSync("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/maplibre-gl-worker.mjs");
