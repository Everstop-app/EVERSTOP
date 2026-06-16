const TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? "";

export type RouteData = {
  coords: [number, number][];
  distanceMi: number;
  durationMin: number;
};

export async function fetchRoute(
  userLat: number,
  userLng: number,
  destLat: number,
  destLng: number
): Promise<RouteData | null> {
  try {
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/` +
      `${userLng},${userLat};${destLng},${destLat}` +
      `?geometries=geojson&overview=full&access_token=${TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;
    return {
      coords: route.geometry.coordinates as [number, number][],
      distanceMi: route.distance * 0.000621371,
      durationMin: Math.round(route.duration / 60),
    };
  } catch {
    return null;
  }
}
