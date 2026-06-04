import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, {
  Callout,
  Marker,
  PROVIDER_DEFAULT,
} from "react-native-maps";

import { useColors } from "@/hooks/useColors";

export type Location = {
  id: string;
  companyName: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  rating: number;
  ratingCount: number;
};

type MapLayerProps = {
  mapRef: React.RefObject<MapView>;
  locations: Location[];
  selectedId: string | null;
  isDark: boolean;
  mapType?: "standard" | "satellite";
  droppedPin?: { lat: number; lng: number } | null;
  onMapPress?: (lat: number, lng: number) => void;
  onMarkerPress: (id: string, lat: number, lng: number) => void;
  onCalloutPress: (id: string) => void;
};

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0f1a2a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a1420" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7a8ca0" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e3048" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#162236" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#253d5a" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#4a9ee0" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#071220" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4a9ee0" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#0f1d2e" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0d1f18" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1e3048" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#162236" }] },
];

const RATING_COLORS: Record<string, string> = {
  high: "#22C55E",
  medium: "#F59E0B",
  low: "#EF4444",
  none: "#7A8CA0",
};

function getRatingColor(rating: number, ratingCount: number): string {
  if (ratingCount === 0) return RATING_COLORS.none;
  if (rating >= 4.0) return RATING_COLORS.high;
  if (rating >= 3.0) return RATING_COLORS.medium;
  return RATING_COLORS.low;
}

export function MapLayer({
  mapRef,
  locations,
  selectedId,
  isDark,
  mapType = "standard",
  droppedPin,
  onMapPress,
  onMarkerPress,
  onCalloutPress,
}: MapLayerProps) {
  const colors = useColors();

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      provider={PROVIDER_DEFAULT}
      mapType={mapType === "satellite" ? "hybrid" : mapType}
      customMapStyle={isDark && mapType === "standard" ? DARK_MAP_STYLE : []}
      initialRegion={{
        latitude: 39.5,
        longitude: -98.35,
        latitudeDelta: 30,
        longitudeDelta: 30,
      }}
      showsUserLocation
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
      onPress={(e) => {
        if (onMapPress) onMapPress(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude);
      }}
    >
      {droppedPin && (
        <Marker
          coordinate={{ latitude: droppedPin.lat, longitude: droppedPin.lng }}
          tracksViewChanges={false}
        >
          <Ionicons name="location" size={38} color="#EF4444" />
        </Marker>
      )}
      {locations.map((loc) => (
        <Marker
          key={loc.id}
          coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
          tracksViewChanges={false}
          onPress={() => onMarkerPress(loc.id, loc.latitude, loc.longitude)}
        >
          <Ionicons
            name="location"
            size={selectedId === loc.id ? 28 : 22}
            color={
              selectedId === loc.id
                ? colors.primary
                : getRatingColor(loc.rating, loc.ratingCount)
            }
          />
          <Callout tooltip onPress={() => onCalloutPress(loc.id)}>
            <View
              style={[
                styles.callout,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text
                style={[styles.calloutName, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {loc.companyName}
              </Text>
              <Text style={[styles.calloutSub, { color: colors.mutedForeground }]}>
                {loc.city}, {loc.state}
              </Text>
              <View style={styles.calloutRow}>
                <Ionicons name="star" size={11} color="#F59E0B" />
                <Text style={[styles.calloutRating, { color: colors.foreground }]}>
                  {loc.ratingCount > 0 ? loc.rating.toFixed(1) : "No ratings"}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.calloutBtn, { backgroundColor: colors.primary }]}
                onPress={() => onCalloutPress(loc.id)}
              >
                <Text style={styles.calloutBtnText}>View Details</Text>
              </TouchableOpacity>
            </View>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    alignSelf: "center",
    marginTop: -1,
  },
  callout: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    width: 200,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  calloutName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  calloutSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  calloutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  calloutRating: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  calloutBtn: {
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: "center",
    marginTop: 4,
  },
  calloutBtnText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
