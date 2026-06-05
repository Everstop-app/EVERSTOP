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
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type { Map as LeafletMap, LeafletMouseEvent } from "leaflet";
import { useColors } from "@/hooks/useColors";
import { useLocations } from "@/contexts/LocationsContext";
import { SearchBar } from "@/components/SearchBar";

const RATING_COLORS: Record<string, string> = {
  high: "#22C55E",
  medium: "#F59E0B",
  low: "#EF4444",
  none: "#7A8CA0",
};

function getPinColor(loc: any): string {
  if (loc.categoryColor) return loc.categoryColor;
  const { rating, ratingCount } = loc;
  if (ratingCount === 0) return RATING_COLORS.none;
  if (rating >= 4.0) return RATING_COLORS.high;
  if (rating >= 3.0) return RATING_COLORS.medium;
  return RATING_COLORS.low;
}

const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const LIGHT_TILES = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const SATELLITE_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const SATELLITE_LABELS_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export default function MapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [mapView, setMapView] = useState<"default" | "satellite">("default");
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [droppingPin, setDroppingPin] = useState(false);
  const [droppedPin, setDroppedPin] = useState<{ lat: number; lng: number } | null>(null);
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (e: LeafletMouseEvent) => {
      setDroppedPin({ lat: e.latlng.lat, lng: e.latlng.lng });
      setDroppingPin(false);
    };
    if (droppingPin) {
      map.on("click", handler);
      map.getContainer().style.cursor = "crosshair";
    } else {
      map.getContainer().style.cursor = "";
    }
    return () => { map.off("click", handler); };
  }, [droppingPin]);

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
            url={mapView === "satellite" ? SATELLITE_TILES : (isDark ? DARK_TILES : LIGHT_TILES)}
            attribution={ATTRIBUTION}
          />
          {mapView === "satellite" && (
            <TileLayer url={SATELLITE_LABELS_TILES} attribution="" />
          )}
          {droppedPin && (
            <Marker
              position={[droppedPin.lat, droppedPin.lng]}
              icon={L.divIcon({
                html: `<svg width="24" height="34" viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 22 12 22s12-13 12-22C24 5.373 18.627 0 12 0z" fill="#EF4444"/><circle cx="12" cy="12" r="4.5" fill="#fff"/></svg>`,
                className: "",
                iconSize: [24, 34],
                iconAnchor: [12, 34],
              })}
            />
          )}
          {results.map((loc) => {
            const color = getPinColor(loc);
            const icon = L.divIcon({
              html: `<svg width="14" height="20" viewBox="0 0 14 20" xmlns="http://www.w3.org/2000/svg"><path d="M7 0C3.134 0 0 3.134 0 7c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z" fill="${color}"/><circle cx="7" cy="7" r="2.5" fill="#fff"/></svg>`,
              className: "",
              iconSize: [14, 20],
              iconAnchor: [7, 20],
              popupAnchor: [0, -20],
            });
            return (
              <Marker
                key={loc.id}
                position={[loc.latitude, loc.longitude]}
                icon={icon}
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
              </Marker>
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
          <View style={styles.layerBtnWrap}>
            <TouchableOpacity
              style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowLayerMenu((v) => !v)}
              activeOpacity={0.8}
            >
              <Ionicons name="layers" size={20} color={showLayerMenu ? colors.primary : colors.foreground} />
            </TouchableOpacity>
            {showLayerMenu && (
              <View style={[styles.layerMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.layerItem, mapView === "default" && { backgroundColor: colors.primary + "18" }]}
                  onPress={() => { setMapView("default"); setShowLayerMenu(false); }}
                >
                  <Ionicons name="map" size={15} color={mapView === "default" ? colors.primary : colors.foreground} />
                  <Text style={[styles.layerItemText, { color: mapView === "default" ? colors.primary : colors.foreground }]}>Default</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.layerItem, mapView === "satellite" && { backgroundColor: colors.primary + "18" }]}
                  onPress={() => { setMapView("satellite"); setShowLayerMenu(false); }}
                >
                  <Ionicons name="earth" size={15} color={mapView === "satellite" ? colors.primary : colors.foreground} />
                  <Text style={[styles.layerItemText, { color: mapView === "satellite" ? colors.primary : colors.foreground }]}>Satellite</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Drop mode banner */}
      {droppingPin && (
        <View style={[styles.dropBanner, { backgroundColor: colors.primary }]} pointerEvents="none">
          <Ionicons name="location" size={15} color="#fff" />
          <Text style={styles.dropBannerText}>Tap anywhere on the map to drop a pin</Text>
        </View>
      )}

      {/* Dropped pin card */}
      {droppedPin && (
        <View
          style={[styles.pinCard, { backgroundColor: colors.card, borderColor: colors.border, bottom: insets.bottom + 84 + 34 + 16 }]}
        >
          <View style={styles.pinCardHeader}>
            <Ionicons name="location" size={18} color="#EF4444" />
            <Text style={[styles.pinCardTitle, { color: colors.foreground }]}>Pin Dropped</Text>
            <TouchableOpacity onPress={() => setDroppedPin(null)}>
              <Ionicons name="close" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.pinCardCoords, { color: colors.mutedForeground }]}>
            {droppedPin.lat.toFixed(5)}, {droppedPin.lng.toFixed(5)}
          </Text>
          <TouchableOpacity
            style={[styles.pinCardBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              router.push(`/add-location?prefill_lat=${droppedPin.lat}&prefill_lon=${droppedPin.lng}`);
              setDroppedPin(null);
            }}
          >
            <Ionicons name="business" size={15} color="#fff" />
            <Text style={styles.pinCardBtnText}>Add Business Here</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add button */}
      <View
        style={[styles.addBtnWrap, { bottom: insets.bottom + 84 + 34 }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            if (droppingPin) { setDroppingPin(false); }
            else { setDroppedPin(null); setDroppingPin(true); }
          }}
          activeOpacity={0.85}
        >
          <View style={[styles.addBtnInner, droppingPin && { backgroundColor: "#EF4444" }]}>
            <Ionicons name={droppingPin ? "close" : "location"} size={26} color={droppingPin ? "#fff" : "#EF4444"} />
          </View>
        </TouchableOpacity>
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
  layerBtnWrap: { position: "relative" },
  layerMenu: {
    position: "absolute",
    top: 48,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 200,
    minWidth: 140,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    overflow: "hidden",
  },
  layerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  layerItemText: { fontSize: 14, fontFamily: "Inter_500Medium" },
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
  dropBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 130,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropBannerText: { color: "#fff", fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  pinCard: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  pinCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  pinCardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  pinCardCoords: { fontSize: 12, fontFamily: "Inter_400Regular" },
  pinCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
  },
  pinCardBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
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
