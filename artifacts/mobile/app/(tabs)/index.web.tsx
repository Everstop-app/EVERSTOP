import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import { useColors } from "@/hooks/useColors";
import { useLocations } from "@/contexts/LocationsContext";
import { SearchBar } from "@/components/SearchBar";

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

const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const LIGHT_TILES = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export default function MapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { filters, setFilters, filteredLocations } = useLocations();
  const [query, setQuery] = useState("");
  const mapRef = useRef<LeafletMap | null>(null);

  const results = filteredLocations(query);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    link.crossOrigin = "";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  const WEB_TOP = 67;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Leaflet map fills the entire screen */}
      <View style={StyleSheet.absoluteFill}>
        <MapContainer
          center={[39.5, -98.35]}
          zoom={4}
          style={{ width: "100%", height: "100%" }}
          ref={mapRef}
          zoomControl={false}
        >
          <TileLayer
            url={isDark ? DARK_TILES : LIGHT_TILES}
            attribution={ATTRIBUTION}
          />
          {results.map((loc) => {
            const color = getRatingColor(loc.rating, loc.ratingCount);
            return (
              <CircleMarker
                key={loc.id}
                center={[loc.latitude, loc.longitude]}
                radius={10}
                fillColor={color}
                color="#fff"
                weight={2}
                fillOpacity={1}
              >
                <Popup>
                  <div style={{ minWidth: 160, fontFamily: "sans-serif" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                      {loc.companyName}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                      {loc.city}, {loc.state}
                    </div>
                    <div style={{ fontSize: 12, marginBottom: 8 }}>
                      ⭐ {loc.ratingCount > 0 ? loc.rating.toFixed(1) : "No ratings"}
                      {loc.ratingCount > 0 && (
                        <span style={{ color: "#9ca3af" }}> ({loc.ratingCount})</span>
                      )}
                    </div>
                    <button
                      onClick={() => router.push(`/location/${loc.id}`)}
                      style={{
                        background: "#4A9EE0",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "6px 12px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        width: "100%",
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </View>

      {/* Search & filter overlay */}
      <View
        style={[styles.overlay, { paddingTop: insets.top + WEB_TOP + 8 }]}
        pointerEvents="box-none"
      >
        <View pointerEvents="none">
          <Image
            source={require("@/assets/images/logo_transparent.png")}
            style={styles.logoImg}
            contentFit="contain"
          />
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search locations..." />
          </View>
        </View>
      </View>

      {/* Add button */}
      <View
        style={[styles.addBtnWrap, { bottom: insets.bottom + 84 + 34 }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/add-location")}
          activeOpacity={0.85}
        >
          <View style={styles.addBtnInner}>
            <Ionicons name="location" size={26} color="#EF4444" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View
        style={[
          styles.legend,
          {
            backgroundColor: colors.card + "EE",
            borderColor: colors.border,
            bottom: insets.bottom + 84 + 34,
            left: 16,
          },
        ]}
        pointerEvents="none"
      >
        {[
          { color: RATING_COLORS.high, label: "4.0+" },
          { color: RATING_COLORS.medium, label: "3.0+" },
          { color: RATING_COLORS.low, label: "<3.0" },
          { color: RATING_COLORS.none, label: "New" },
        ].map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    gap: 8,
  },
  logoImg: { width: 150, height: 50 },
  searchRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  searchWrap: { flex: 1 },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
  filterBarWrap: {
    marginHorizontal: -16,
  },
  countRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  countText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  addBtnWrap: {
    position: "absolute",
    right: 20,
  },
  addBtn: {
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  legend: {
    position: "absolute",
    flexDirection: "row",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
});
