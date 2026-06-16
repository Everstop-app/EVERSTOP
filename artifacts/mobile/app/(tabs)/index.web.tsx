import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import mapboxgl from "mapbox-gl";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type { Map as LeafletMapInstance, LeafletMouseEvent } from "leaflet";
import { useColors } from "@/hooks/useColors";
import { useLocations } from "@/contexts/LocationsContext";
import { SearchBar } from "@/components/SearchBar";
import type { Location } from "@/components/MapLayer";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? "";
mapboxgl.accessToken = MAPBOX_TOKEN;

const STYLE_LIGHT = "mapbox://styles/mapbox/streets-v12";
const STYLE_DARK = "mapbox://styles/mapbox/dark-v11";
const STYLE_SATELLITE = "mapbox://styles/mapbox/satellite-streets-v12";

const MAPBOX_RASTER_STREETS = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`;
const MAPBOX_RASTER_DARK = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`;
const MAPBOX_RASTER_SATELLITE = `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`;
const ATTRIBUTION = '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const RATING_COLORS: Record<string, string> = {
  high: "#22C55E",
  medium: "#F59E0B",
  low: "#EF4444",
  none: "#7A8CA0",
};

function getPinColor(loc: Location): string {
  if (loc.categoryColor) return loc.categoryColor;
  const { rating, ratingCount } = loc;
  if (ratingCount === 0) return RATING_COLORS.none;
  if (rating >= 4.0) return RATING_COLORS.high;
  if (rating >= 3.0) return RATING_COLORS.medium;
  return RATING_COLORS.low;
}

function makePinEl(color: string, size = 14): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = `<svg width="${size}" height="${Math.round(size * 1.43)}" viewBox="0 0 14 20" xmlns="http://www.w3.org/2000/svg"><path d="M7 0C3.134 0 0 3.134 0 7c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z" fill="${color}"/><circle cx="7" cy="7" r="2.5" fill="#fff"/></svg>`;
  el.style.cursor = "pointer";
  el.style.display = "block";
  return el;
}

function makeDroppedPinEl(): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = `<svg width="24" height="34" viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 22 12 22s12-13 12-22C24 5.373 18.627 0 12 0z" fill="#EF4444"/><circle cx="12" cy="12" r="4.5" fill="#fff"/></svg>`;
  el.style.display = "block";
  return el;
}

type MapView = "default" | "satellite";

// ─── Full Mapbox GL JS map (WebGL path) ─────────────────────────────────────

type MapboxMapProps = {
  locations: Location[];
  isDark: boolean;
  mapView: MapView;
  droppingPin: boolean;
  droppedPin: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
  onLocationNav: (id: string) => void;
  onFallback: () => void;
};

function MapboxMap({
  locations,
  isDark,
  mapView,
  droppingPin,
  droppedPin,
  onMapClick,
  onLocationNav,
  onFallback,
}: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const droppedMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const droppingRef = useRef(droppingPin);
  droppingRef.current = droppingPin;

  const styleUrl = mapView === "satellite" ? STYLE_SATELLITE : isDark ? STYLE_DARK : STYLE_LIGHT;

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://api.mapbox.com/mapbox-gl-js/v3.12.0/mapbox-gl.css";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: styleUrl,
        center: [-98.35, 39.5],
        zoom: 3.5,
        attributionControl: false,
      });
    } catch {
      onFallback();
      return;
    }
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    map.on("click", (e) => {
      if (!droppingRef.current) return;
      onMapClick(e.lngLat.lat, e.lngLat.lng);
    });
    map.on("error", () => { onFallback(); });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getContainer().style.cursor = droppingPin ? "crosshair" : "";
  }, [droppingPin]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    map.setStyle(styleUrl);
  }, [styleUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const addMarkers = () => {
      locations.forEach((loc) => {
        const color = getPinColor(loc);
        const el = makePinEl(color);
        const popup = new mapboxgl.Popup({ offset: 20, closeButton: false, maxWidth: "220px" })
          .setHTML(`
            <div style="font-family:sans-serif;padding:4px 0">
              <div style="font-weight:700;font-size:14px;margin-bottom:2px">${loc.companyName}</div>
              <div style="font-size:12px;color:#6b7280;margin-bottom:4px">${loc.city}, ${loc.state}</div>
              <div style="font-size:12px;margin-bottom:8px">⭐ ${loc.ratingCount > 0 ? loc.rating.toFixed(1) : "No ratings"}${loc.ratingCount > 0 ? ` <span style="color:#9ca3af">(${loc.ratingCount})</span>` : ""}</div>
              <button data-loc-id="${loc.id}" style="background:#3D8DC4;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:13px;font-weight:600;cursor:pointer;width:100%">View Details</button>
            </div>
          `);
        popup.on("open", () => {
          popup.getElement()?.querySelector("button")?.addEventListener("click", () => {
            onLocationNav(loc.id);
          });
        });
        const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([loc.longitude, loc.latitude])
          .setPopup(popup)
          .addTo(map);
        markersRef.current.push(marker);
      });
    };

    if (map.isStyleLoaded()) {
      addMarkers();
    } else {
      map.once("styledata", addMarkers);
    }
  }, [locations]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (droppedMarkerRef.current) { droppedMarkerRef.current.remove(); droppedMarkerRef.current = null; }
    if (!droppedPin) return;
    const el = makeDroppedPinEl();
    droppedMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
      .setLngLat([droppedPin.lng, droppedPin.lat])
      .addTo(map);
  }, [droppedPin]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}

// ─── Leaflet fallback (no WebGL) ─────────────────────────────────────────────

type LeafletMapProps = {
  locations: Location[];
  isDark: boolean;
  mapView: MapView;
  droppingPin: boolean;
  droppedPin: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
  onLocationNav: (id: string) => void;
};

function LeafletMap({
  locations,
  isDark,
  mapView,
  droppingPin,
  droppedPin,
  onMapClick,
  onLocationNav,
}: LeafletMapProps) {
  const mapRef = useRef<LeafletMapInstance | null>(null);

  const tileUrl = mapView === "satellite"
    ? MAPBOX_RASTER_SATELLITE
    : isDark ? MAPBOX_RASTER_DARK : MAPBOX_RASTER_STREETS;

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
    const handler = (e: LeafletMouseEvent) => { onMapClick(e.latlng.lat, e.latlng.lng); };
    if (droppingPin) { map.on("click", handler); map.getContainer().style.cursor = "crosshair"; }
    else { map.getContainer().style.cursor = ""; }
    return () => { map.off("click", handler); };
  }, [droppingPin, onMapClick]);

  return (
    <MapContainer
      center={[39.5, -98.35]}
      zoom={4}
      style={{ width: "100%", height: "100%" }}
      ref={mapRef}
      zoomControl={false}
    >
      <TileLayer url={tileUrl} attribution={ATTRIBUTION} tileSize={256} />
      {droppedPin && (
        <Marker
          position={[droppedPin.lat, droppedPin.lng]}
          icon={L.divIcon({
            html: `<svg width="24" height="34" viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 22 12 22s12-13 12-22C24 5.373 18.627 0 12 0z" fill="#EF4444"/><circle cx="12" cy="12" r="4.5" fill="#fff"/></svg>`,
            className: "", iconSize: [24, 34], iconAnchor: [12, 34],
          })}
        />
      )}
      {locations.map((loc) => {
        const color = getPinColor(loc);
        const icon = L.divIcon({
          html: `<svg width="14" height="20" viewBox="0 0 14 20" xmlns="http://www.w3.org/2000/svg"><path d="M7 0C3.134 0 0 3.134 0 7c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z" fill="${color}"/><circle cx="7" cy="7" r="2.5" fill="#fff"/></svg>`,
          className: "", iconSize: [14, 20], iconAnchor: [7, 20], popupAnchor: [0, -20],
        });
        return (
          <Marker key={loc.id} position={[loc.latitude, loc.longitude]} icon={icon}>
            <Popup>
              <div style={{ minWidth: 160, fontFamily: "sans-serif" }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{loc.companyName}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{loc.city}, {loc.state}</div>
                <div style={{ fontSize: 12, marginBottom: 8 }}>
                  ⭐ {loc.ratingCount > 0 ? loc.rating.toFixed(1) : "No ratings"}
                  {loc.ratingCount > 0 && <span style={{ color: "#9ca3af" }}> ({loc.ratingCount})</span>}
                </div>
                <button
                  onClick={() => onLocationNav(loc.id)}
                  style={{ background: "#3D8DC4", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%" }}
                >
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function MapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [mapView, setMapView] = useState<MapView>("default");
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [droppingPin, setDroppingPin] = useState(false);
  const [droppedPin, setDroppedPin] = useState<{ lat: number; lng: number } | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { filteredLocations } = useLocations();
  const [query, setQuery] = useState("");
  const results = filteredLocations(query);
  const [useGL, setUseGL] = useState(() => {
    try { return mapboxgl.supported(); } catch { return false; }
  });

  const handleMapClick = (lat: number, lng: number) => {
    if (!droppingPin) return;
    setDroppedPin({ lat, lng });
    setDroppingPin(false);
  };

  const handleLocationNav = (id: string) => router.push(`/location/${id}`);

  const WEB_TOP = 67;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={StyleSheet.absoluteFill}>
        {useGL ? (
          <MapboxMap
            locations={results}
            isDark={isDark}
            mapView={mapView}
            droppingPin={droppingPin}
            droppedPin={droppedPin}
            onMapClick={handleMapClick}
            onLocationNav={handleLocationNav}
            onFallback={() => setUseGL(false)}
          />
        ) : (
          <LeafletMap
            locations={results}
            isDark={isDark}
            mapView={mapView}
            droppingPin={droppingPin}
            droppedPin={droppedPin}
            onMapClick={handleMapClick}
            onLocationNav={handleLocationNav}
          />
        )}
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

      {/* Drop pin banner */}
      {droppingPin && (
        <View style={[styles.dropBanner, { backgroundColor: colors.primary }]} pointerEvents="none">
          <Ionicons name="location" size={15} color="#fff" />
          <Text style={styles.dropBannerText}>Tap anywhere on the map to drop a pin</Text>
        </View>
      )}

      {/* Dropped pin card */}
      {droppedPin && (
        <View style={[styles.pinCard, { backgroundColor: colors.card, borderColor: colors.border, bottom: insets.bottom + 84 + 34 + 16 }]}>
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

      {/* Add / drop-pin FAB */}
      <View style={[styles.addBtnWrap, { bottom: insets.bottom + 84 + 34 }]} pointerEvents="box-none">
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
  overlay: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 16, gap: 8 },
  logoImg: { width: 150, height: 50 },
  searchRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  searchWrap: { flex: 1 },
  layerBtnWrap: { position: "relative" },
  layerMenu: {
    position: "absolute", top: 48, right: 0, borderRadius: 12, borderWidth: 1,
    zIndex: 200, minWidth: 140, shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 10, overflow: "hidden",
  },
  layerItem: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 11 },
  layerItemText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  filterBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  dropBanner: {
    position: "absolute", left: 16, right: 16, top: 130, borderRadius: 12,
    flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10,
  },
  dropBannerText: { color: "#fff", fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  pinCard: {
    position: "absolute", left: 16, right: 16, borderRadius: 16, borderWidth: 1, padding: 14, gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 10,
  },
  pinCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  pinCardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  pinCardCoords: { fontSize: 12, fontFamily: "Inter_400Regular" },
  pinCardBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 12 },
  pinCardBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  addBtnWrap: { position: "absolute", right: 20 },
  addBtn: { alignItems: "center", justifyContent: "center" },
  addBtnInner: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", elevation: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6,
  },
});
