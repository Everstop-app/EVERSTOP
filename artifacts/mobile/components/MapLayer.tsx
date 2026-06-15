import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, {
  Callout,
  Marker,
  PROVIDER_DEFAULT,
  UrlTile,
} from "react-native-maps";

import { useColors } from "@/hooks/useColors";

const OSM_STANDARD = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_DARK = "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png";
const ESRI_SATELLITE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

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
  onMapPress?: (lat: number, lng: number) => void;
  onMarkerPress: (id: string, lat: number, lng: number) => void;
  onCalloutPress: (id: string) => void;
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
  onMapPress,
  onMarkerPress,
  onCalloutPress,
}: MapLayerProps) {
  const colors = useColors();

  const tileUrl = mapType === "satellite"
    ? ESRI_SATELLITE
    : isDark ? OSM_DARK : OSM_STANDARD;

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
          <CategoryPin location={loc} selected={selectedId === loc.id} />
          <Callout tooltip onPress={() => onCalloutPress(loc.id)}>
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
              <TouchableOpacity
                style={[styles.calloutBtn, { backgroundColor: getPinColor(loc) }]}
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
