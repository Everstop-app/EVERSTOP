export type HazardType = "bridge" | "weighstation" | "catscale" | "railroad";

export type Hazard = {
  id: string;
  type: HazardType;
  lat: number;
  lng: number;
  label: string;
  detail?: string;
};

function parseHeightMeters(raw: string): number | null {
  const s = raw.trim();
  // "13'6"" or "13'6"
  const fi = s.match(/^(\d+)'(\d+)"?$/);
  if (fi) return (parseInt(fi[1]) * 12 + parseInt(fi[2])) * 0.0254;
  // "13.5 ft" or "13ft"
  const ft = s.match(/^([\d.]+)\s*ft$/i);
  if (ft) return parseFloat(ft[1]) * 0.3048;
  // "4.1" or "4.1 m" (OSM default is meters)
  const m = s.match(/^([\d.]+)\s*m?$/i);
  if (m) return parseFloat(m[1]);
  return null;
}

const LIMIT_M = 4.115; // 13'6" in meters

export async function fetchLocationHazards(lat: number, lng: number, radiusDeg = 0.07): Promise<Hazard[]> {
  const fakeLine: [number, number][] = [
    [lng - radiusDeg, lat - radiusDeg],
    [lng + radiusDeg, lat + radiusDeg],
  ];
  return fetchRouteHazards(fakeLine);
}

export async function fetchRouteHazards(coords: [number, number][]): Promise<Hazard[]> {
  if (coords.length < 2) return [];

  const lngs = coords.map(([lng]) => lng);
  const lats = coords.map(([, lat]) => lat);
  const PAD = 0.025; // ~2.8 km buffer around route bbox
  const south = (Math.min(...lats) - PAD).toFixed(6);
  const west  = (Math.min(...lngs) - PAD).toFixed(6);
  const north = (Math.max(...lats) + PAD).toFixed(6);
  const east  = (Math.max(...lngs) + PAD).toFixed(6);
  const bbox  = `${south},${west},${north},${east}`;

  const query = [
    "[out:json][timeout:30];",
    "(",
    `  node["maxheight"](${bbox});`,
    `  way["maxheight"]["highway"](${bbox});`,
    `  node["amenity"="weigh_station"](${bbox});`,
    `  node["highway"="weigh_station"](${bbox});`,
    `  node["amenity"="cat_scale"](${bbox});`,
    `  node["brand"~"Cat Scale",i](${bbox});`,
    `  node["cat_scale"="yes"](${bbox});`,
    `  node["railway"="level_crossing"]["crossing:hump"="yes"](${bbox});`,
    ");",
    "out center;",
  ].join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35000);

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];

    const data = (await res.json()) as { elements?: any[] };
    const hazards: Hazard[] = [];
    const seen = new Set<string>();

    for (const el of data.elements ?? []) {
      const lat: number = el.lat ?? el.center?.lat;
      const lng: number = el.lon ?? el.center?.lon;
      if (!lat || !lng) continue;
      const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const t: Record<string, string> = el.tags ?? {};

      if (
        t.amenity === "cat_scale" ||
        t.cat_scale === "yes" ||
        (t.brand ?? "").toLowerCase().includes("cat scale")
      ) {
        hazards.push({ id: String(el.id), type: "catscale", lat, lng, label: t.name ?? "CAT Scale" });
        continue;
      }
      if (t.amenity === "weigh_station" || t.highway === "weigh_station") {
        hazards.push({
          id: String(el.id), type: "weighstation", lat, lng,
          label: t.name ?? "Weigh Station",
          detail: t.operator ?? undefined,
        });
        continue;
      }
      if (t.railway === "level_crossing" && t["crossing:hump"] === "yes") {
        hazards.push({ id: String(el.id), type: "railroad", lat, lng, label: "Railroad Hump Crossing" });
        continue;
      }
      if (t.maxheight) {
        const hm = parseHeightMeters(t.maxheight);
        if (hm !== null && hm < LIMIT_M) {
          const totalIn = Math.round(hm / 0.0254);
          const ft = Math.floor(totalIn / 12);
          const inch = totalIn % 12;
          hazards.push({
            id: String(el.id), type: "bridge", lat, lng,
            label: t.name ?? "Low Clearance",
            detail: `${ft}'${inch}" clearance`,
          });
        }
      }
    }
    return hazards;
  } catch {
    clearTimeout(timer);
    return [];
  }
}
