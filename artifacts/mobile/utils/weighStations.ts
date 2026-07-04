export type WeighStation = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  detail?: string;
};

export async function fetchWeighStationsAlongRoute(coords: [number, number][]): Promise<WeighStation[]> {
  if (coords.length < 2) return [];

  const lngs = coords.map(([lng]) => lng);
  const lats = coords.map(([, lat]) => lat);
  const PAD = 0.03;
  const south = (Math.min(...lats) - PAD).toFixed(6);
  const west = (Math.min(...lngs) - PAD).toFixed(6);
  const north = (Math.max(...lats) + PAD).toFixed(6);
  const east = (Math.max(...lngs) + PAD).toFixed(6);
  const bbox = `${south},${west},${north},${east}`;

  const query = [
    "[out:json][timeout:30];",
    "(",
    `  node["amenity"="weigh_station"](${bbox});`,
    `  node["highway"="weigh_station"](${bbox});`,
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
    const stations: WeighStation[] = [];
    const seen = new Set<string>();

    for (const el of data.elements ?? []) {
      const lat: number = el.lat ?? el.center?.lat;
      const lng: number = el.lon ?? el.center?.lon;
      if (!lat || !lng) continue;
      const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const t: Record<string, string> = el.tags ?? {};
      stations.push({
        id: String(el.id),
        lat,
        lng,
        label: t.name ?? "Weigh Station",
        detail: t.operator ?? undefined,
      });
    }
    return stations;
  } catch {
    clearTimeout(timer);
    return [];
  }
}
