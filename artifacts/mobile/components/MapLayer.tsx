import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, {
  Callout,
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  UrlTile,
} from "react-native-maps";

import { useColors } from "@/hooks/useColors";
import type { Hazard, HazardType } from "@/utils/routeHazards";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? "";
function mapboxUrl(style: string) {
  return `https://api.mapbox.com/styles/v1/mapbox/${style}/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`;
}

export type Location = {
  id: string;
  companyName: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  rating: number;
  ratingCount: number;
  category?: string;
  categoryColor?: string;
  verificationScore?: number;
  upvotes?: number;
};

type MapLayerProps = {
  mapRef: React.RefObject<MapView>;
  locations: Location[];
  selectedId: string | null;
  isDark: boolean;
  mapType?: "standard" | "satellite";
  droppedPin?: { lat: number; lng: number } | null;
  routeCoords?: [number, number][] | null;
  hazards?: Hazard[];
  onMapPress?: (lat: number, lng: number) => void;
  onMarkerPress: (id: string, lat: number, lng: number) => void;
  onCalloutPress: (id: string) => void;
  onDirectionsPress?: (id: string, lat: number, lng: number) => void;
};

const CATEGORY_ICONS: Record<string, { icon: string; set: "ionicons" | "material" }> = {
  "Dry Van":          { icon: "cube",           set: "ionicons" },
  "Reefer":           { icon: "snow",            set: "ionicons" },
  "Flatbed":          { icon: "layers",          set: "ionicons" },
  "Bulk/Tanker":      { icon: "water",           set: "ionicons" },
  "Food & Beverage":  { icon: "nutrition",       set: "ionicons" },
  "Containers":       { icon: "grid",            set: "ionicons" },
  "Freight / Courier":{ icon: "cube-outline",    set: "ionicons" },
};

const CATEGORY_COLORS: Record<string, string> = {
  "Dry Van":           "#D22F30",
  "Reefer":            "#3B82F6",
  "Flatbed":           "#F59E0B",
  "Bulk/Tanker":       "#22C55E",
  "Food & Beverage":   "#8B5CF6",
  "Containers":        "#06B6D4",
  "Freight / Courier": "#8B5CF6",
};

function getPinColor(location: Location): string {
  if (location.categoryColor) return location.categoryColor;
  if (location.category && CATEGORY_COLORS[location.category]) return CATEGORY_COLORS[location.category];
  const { rating, ratingCount } = location;
  if (ratingCount === 0) return "#7A8CA0";
  if (rating >= 4.0) return "#22C55E";
  if (rating >= 3.0) return "#F59E0B";
  return "#EF4444";
}

const HAZARD_CFG: Record<HazardType, { bg: string; symbol: string }> = {
  bridge:       { bg: "#F59E0B", symbol: "⚠" },
  weighstation: { bg: "#1E3A8A", symbol: "W" },
  catscale:     { bg: "#0E7490", symbol: "C" },
  railroad:     { bg: "#7C3AED", symbol: "R" },
};

function HazardPin({ type }: { type: HazardType }) {
  const { bg, symbol } = HAZARD_CFG[type];
  return (
    <View style={[styles.hazardPin, { backgroundColor: bg }]}>
      <Text style={styles.hazardPinText}>{symbol}</Text>
    </View>
  );
}

function isTrustedLocation(location: Location): boolean {
  return (location.verificationScore ?? 0) >= 90 && (location.upvotes ?? 0) >= 40;
}

function CategoryPin({ location, selected }: { location: Location; selected: boolean }) {
  const color = getPinColor(location);
  const trusted = isTrustedLocation(location);
  const size = selected ? 32 : 26;
  const category = location.category ?? "";
  const iconInfo = CATEGORY_ICONS[category];

  return (
    <View style={styles.pinWrap}>
      <View
        style={[
          styles.pinBubble,
          {
            backgroundColor: color,
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: selected ? 3 : 2,
            borderColor: selected ? "#fff" : color + "88",
          },
        ]}
      >
        {iconInfo ? (
          iconInfo.set === "ionicons" ? (
            <Ionicons name={iconInfo.icon as any} size={size * 0.52} color="#fff" />
          ) : (
            <MaterialCommunityIcons name={iconInfo.icon as any} size={size * 0.52} color="#fff" />
          )
        ) : (
          <Ionicons name="location" size={size * 0.52} color="#fff" />
        )}
      </View>
      {trusted && (
        <View style={styles.trustedBadge}>
          <Ionicons name="shield-checkmark" size={10} color="#fff" />
        </View>
      )}
      <View style={[styles.pinTail, { borderTopColor: color }]} />
    </View>
  );
}

export function MapLayer({
  mapRef,
  locations,
  selectedId,
  isDark,
  mapType = "standard",
  droppedPin,
  routeCoords,
  hazards = [],
  onMapPress,
  onMarkerPress,
  onCalloutPress,
  onDirectionsPress,
}: MapLayerProps) {
  const colors = useColors();

  const tileUrl = mapType === "satellite"
    ? mapboxUrl("satellite-streets-v12")
    : isDark ? mapboxUrl("dark-v11") : mapboxUrl("streets-v12");

  const routeLatLngs = routeCoords && routeCoords.length > 1
    ? routeCoords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }))
    : null;

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      provider={PROVIDER_DEFAULT}
      mapType="none"
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
      <UrlTile
        urlTemplate={tileUrl}
        maximumZ={19}
        tileSize={256}
        zIndex={-1}
      />

      {routeLatLngs && (
        <>
          <Polyline
            coordinates={routeLatLngs}
            strokeWidth={8}
            strokeColor="rgba(255,255,255,0.9)"
            zIndex={1}
          />
          <Polyline
            coordinates={routeLatLngs}
            strokeWidth={5}
            strokeColor="#3D8DC4"
            zIndex={2}
          />
        </>
      )}

      {droppedPin && (
        <Marker
          coordinate={{ latitude: droppedPin.lat, longitude: droppedPin.lng }}
          tracksViewChanges={false}
        >
          <Ionicons name="location" size={38} color="#EF4444" />
        </Marker>
      )}

      {hazards.map((h) => (
        <Marker
          key={`h-${h.id}`}
          coordinate={{ latitude: h.lat, longitude: h.lng }}
          tracksViewChanges={false}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <HazardPin type={h.type} />
          <Callout tooltip>
            <View style={[styles.hazardCallout, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.hazardCalloutTitle, { color: colors.foreground }]}>{h.label}</Text>
              {h.detail ? (
                <Text style={[styles.hazardCalloutSub, { color: colors.mutedForeground }]}>{h.detail}</Text>
              ) : null}
            </View>
          </Callout>
        </Marker>
      ))}

      {locations.map((loc) => (
        <Marker
          key={loc.id}
          coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
          tracksViewChanges={false}
          onPress={() => onMarkerPress(loc.id, loc.latitude, loc.longitude)}
        >
          <CategoryPin location={loc} selected={selectedId === loc.id} />
          <Callout tooltip>
            <View
              style={[
                styles.callout,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {isTrustedLocation(loc) && (
                <View style={styles.trustedCalloutBadge}>
                  <Ionicons name="shield-checkmark" size={11} color="#22C55E" />
                  <Text style={styles.trustedCalloutText}>Trusted Location</Text>
                </View>
              )}
              <Text
                style={[styles.calloutName, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {loc.companyName}
              </Text>
              <View style={styles.calloutMeta}>
                {loc.category ? (
                  <View style={[styles.calloutCatChip, { backgroundColor: getPinColor(loc) + "22" }]}>
                    <Text style={[styles.calloutCat, { color: getPinColor(loc) }]}>{loc.category}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.calloutSub, { color: colors.mutedForeground }]}>
                {loc.city}, {loc.state}
              </Text>
              <View style={styles.calloutRow}>
                <Ionicons name="star" size={11} color="#F59E0B" />
                <Text style={[styles.calloutRating, { color: colors.foreground }]}>
                  {loc.ratingCount > 0 ? loc.rating.toFixed(1) : "No ratings"}
                </Text>
                {(loc.upvotes ?? 0) > 0 && (
                  <>
                    <Text style={[styles.calloutRating, { color: colors.mutedForeground }]}>·</Text>
                    <Ionicons name="thumbs-up" size={10} color={colors.mutedForeground} />
                    <Text style={[styles.calloutRating, { color: colors.mutedForeground }]}>{loc.upvotes}</Text>
                  </>
                )}
              </View>
              <View style={styles.calloutBtns}>
                <TouchableOpacity
                  style={[styles.calloutBtnPrimary, { backgroundColor: getPinColor(loc) }]}
                  onPress={() => onCalloutPress(loc.id)}
                >
                  <Text style={styles.calloutBtnText}>View Details</Text>
                </TouchableOpacity>
                {onDirectionsPress && (
                  <TouchableOpacity
                    style={[styles.calloutBtnSecondary, { borderColor: getPinColor(loc) }]}
                    onPress={() => onDirectionsPress(loc.id, loc.latitude, loc.longitude)}
                  >
                    <Ionicons name="navigate" size={13} color={getPinColor(loc)} />
                    <Text style={[styles.calloutBtnSecText, { color: getPinColor(loc) }]}>Route</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  pinWrap: {
    alignItems: "center",
  },
  pinBubble: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 5,
  },
  trustedBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -1,
  },
  callout: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    width: 210,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  trustedCalloutBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  trustedCalloutText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#22C55E",
  },
  calloutMeta: {
    flexDirection: "row",
    gap: 6,
  },
  calloutCatChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  calloutCat: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
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
  calloutBtns: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  calloutBtnPrimary: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  calloutBtnSecondary: {
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
    borderWidth: 1.5,
  },
  calloutBtnText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  calloutBtnSecText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  hazardPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 5,
  },
  hazardPinText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  hazardCallout: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    minWidth: 130,
    maxWidth: 190,
    gap: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  hazardCalloutTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  hazardCalloutSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
