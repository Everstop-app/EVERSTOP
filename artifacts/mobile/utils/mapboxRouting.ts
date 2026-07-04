const TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? "";

export type RouteData = {
  coords: [number, number][];
  distanceMi: number;
  durationMin: number;
};

export async function fetchRoutes(
  userLat: number,
  userLng: number,
  destLat: number,
  destLng: number,
  waypoints: [number, number][] = []
): Promise<RouteData[]> {
  try {
    const stops = [[userLng, userLat], ...waypoints, [destLng, destLat]];
    const coordsPart = stops.map(([lng, lat]) => `${lng},${lat}`).join(";");
    const alternatives = waypoints.length === 0;
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsPart}` +
      `?geometries=geojson&overview=full&alternatives=${alternatives}&access_token=${TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const routes = data.routes ?? [];
    return routes.slice(0, 3).map((route: any) => ({
      coords: route.geometry.coordinates as [number, number][],
      distanceMi: route.distance * 0.000621371,
      durationMin: Math.round(route.duration / 60),
    }));
  } catch {
    return [];
  }
}

export async function fetchRoute(
  userLat: number,
  userLng: number,
  destLat: number,
  destLng: number
): Promise<RouteData | null> {
  const routes = await fetchRoutes(userLat, userLng, destLat, destLng);
  return routes[0] ?? null;
}
