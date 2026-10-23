// The one basemap, shared by the app and the public landing page.
import type { Map as MLMap } from "maplibre-gl";

export const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

// maplibre's worker, copied into public/ on install (scripts/copy-maplibre-worker.mjs).
// Pass to setWorkerUrl() before creating a map; the version busts the cache on upgrades.
export const workerUrl = (version: string) => `/maplibre-gl-worker.mjs?v=${version}`;

// Positron's quiet linework with a little colour put back: blue water, green parks, warm land
type PaintProp = Parameters<MLMap["setPaintProperty"]>[1];
const PAINT: Record<string, [PaintProp, string]> = {
  background: ["background-color", "#f5f4ef"], water: ["fill-color", "#bcd9ea"], waterway: ["line-color", "#bcd9ea"],
  park: ["fill-color", "#d3e8ca"], landcover_wood: ["fill-color", "#cfe3c6"], landuse_residential: ["fill-color", "#ece8df"],
  building: ["fill-color", "#e7e3da"], highway_major_casing: ["line-color", "#dcd8cf"], highway_motorway_casing: ["line-color", "#dcd8cf"],
  highway_minor: ["line-color", "#e4e1d9"], railway: ["line-color", "#d9d5cc"],
};

/** Call once the style has loaded. */
export function tintMap(map: MLMap) {
  for (const [id, [prop, v]] of Object.entries(PAINT)) if (map.getLayer(id)) map.setPaintProperty(id, prop, v);
  if (map.getLayer("building")) map.setPaintProperty("building", "fill-outline-color", "#d9d4c9");
}
