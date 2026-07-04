export type PoiCategory =
  | "truck_stop"
  | "truck_wash"
  | "washout"
  | "parking"
  | "rest_area"
  | "repair_shop";

export const POI_CATEGORIES: { key: PoiCategory; label: string; icon: string }[] = [
  { key: "truck_stop", label: "Truck Stops", icon: "car" },
  { key: "truck_wash", label: "Truck Washes", icon: "water" },
  { key: "washout", label: "Washouts", icon: "beaker" },
  { key: "parking", label: "Truck Parking", icon: "square" },
  { key: "rest_area", label: "Rest Areas", icon: "bed" },
  { key: "repair_shop", label: "Repair Shops", icon: "construct" },
];

export type Poi = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  category: PoiCategory;
};

const OVERPASS_FILTERS: Record<PoiCategory, string[]> = {
  truck_stop: [`node["amenity"="fuel"]["hgv"="yes"](__BBOX__);`, `node["shop"="truck_stop"](__BBOX__);`],
  truck_wash: [`node["shop"="car_wash"]["hgv"="yes"](__BBOX__);`, `node["amenity"="car_wash"]["hgv"="yes"](__BBOX__);`],
  washout: [`node["amenity"="vehicle_inspection"](__BBOX__);`, `node["service"="washout"](__BBOX__);`],
  parking: [`node["amenity"="parking"]["hgv"="yes"](__BBOX__);`, `node["amenity"="parking"]["truck"="yes"](__BBOX__);`],
  rest_area: [`node["highway"="rest_area"](__BBOX__);`, `node["highway"="services"](__BBOX__);`],
  repair_shop: [`node["shop"="car_repair"]["hgv"="yes"](__BBOX__);`, `node["shop"="truck_repair"](__BBOX__);`],
};

const LABEL_DEFAULTS: Record<PoiCategory, string> = {
  truck_stop: "Truck Stop",
  truck_wash: "Truck Wash",
  washout: "Washout",
  parking: "Truck Parking",
  rest_area: "Rest Area",
  repair_shop: "Repair Shop",
};

export async function fetchPoisAlongRoute(
  category: PoiCategory,
  coords: [number, number][]
): Promise<Poi[]> {
  if (coords.length < 2) return [];

  const lngs = coords.map(([lng]) => lng);
  const lats = coords.map(([, lat]) => lat);
  const PAD = 0.06;
  const south = (Math.min(...lats) - PAD).toFixed(6);
  const west = (Math.min(...lngs) - PAD).toFixed(6);
  const north = (Math.max(...lats) + PAD).toFixed(6);
  const east = (Math.max(...lngs) + PAD).toFixed(6);
  const bbox = `${south},${west},${north},${east}`;

  const filters = OVERPASS_FILTERS[category].map((f) => `  ${f.replace("__BBOX__", bbox)}`);
  const query = ["[out:json][timeout:30];", "(", ...filters, ");", "out center;"].join("\n");

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
    const pois: Poi[] = [];
    const seen = new Set<string>();

    for (const el of data.elements ?? []) {
      const lat: number = el.lat ?? el.center?.lat;
      const lng: number = el.lon ?? el.center?.lon;
      if (!lat || !lng) continue;
      const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const t: Record<string, string> = el.tags ?? {};
      pois.push({
        id: String(el.id),
        lat,
        lng,
        label: t.name ?? LABEL_DEFAULTS[category],
        category,
      });
    }
    return pois.slice(0, 30);
  } catch {
    clearTimeout(timer);
    return [];
  }
}
