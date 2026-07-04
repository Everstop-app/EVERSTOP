import { Linking, Platform } from "react-native";

export type NavStop = { lat: number; lng: number; label?: string };

export async function startNativeNavigation(destination: NavStop, waypoints: NavStop[] = []) {
  const stops = [...waypoints, destination];

  if (Platform.OS === "ios") {
    const chain = stops.map((s) => `${s.lat},${s.lng}`).join("+to:");
    const url = `maps://?daddr=${chain}&dirflg=d`;
    const can = await Linking.canOpenURL(url);
    if (can) {
      await Linking.openURL(url);
      return;
    }
  }

  if (Platform.OS === "android" && waypoints.length === 0) {
    const url = `google.navigation:q=${destination.lat},${destination.lng}&mode=d`;
    const can = await Linking.canOpenURL(url);
    if (can) {
      await Linking.openURL(url);
      return;
    }
  }

  const params = new URLSearchParams({
    api: "1",
    destination: `${destination.lat},${destination.lng}`,
    travelmode: "driving",
  });
  if (waypoints.length > 0) {
    params.set("waypoints", waypoints.map((w) => `${w.lat},${w.lng}`).join("|"));
  }
  const webUrl = `https://www.google.com/maps/dir/?${params.toString()}`;
  await Linking.openURL(webUrl);
}
