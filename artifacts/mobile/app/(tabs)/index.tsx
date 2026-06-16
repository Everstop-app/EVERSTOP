import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MapLayer } from "@/components/MapLayer";
import { SearchBar } from "@/components/SearchBar";
import { useColors } from "@/hooks/useColors";
import { useLocations } from "@/contexts/LocationsContext";
import { fetchRoute, type RouteData } from "@/utils/mapboxRouting";

export default function MapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { filteredLocations } = useLocations();

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapType, setMapType] = useState<"standard" | "satellite">("standard");
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [droppingPin, setDroppingPin] = useState(false);
  const [droppedPin, setDroppedPin] = useState<{ lat: number; lng: number } | null>(null);

  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [routeDestName, setRouteDestName] = useState<string | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  const mapRef = useRef<any>(null);
  const results = filteredLocations(query);

  const WEB_TOP = Platform.OS === "web" ? 67 : 0;
  const BOTTOM_BASE = insets.bottom + (Platform.OS === "web" ? 84 + 34 : 90);

  const handleMarkerPress = (id: string, lat: number, lng: number) => {
    setSelectedId(id);
    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      600
    );
  };

  const navigateToLocation = (id: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    router.push(`/location/${id}`);
  };

  const handleDirections = async (id: string, lat: number, lng: number) => {
    const loc = results.find((l) => l.id === id);
    setRouteDestName(loc?.companyName ?? null);
    setIsLoadingRoute(true);
    setRouteData(null);
    setDroppedPin(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setIsLoadingRoute(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const route = await fetchRoute(pos.coords.latitude, pos.coords.longitude, lat, lng);
      setRouteData(route);

      if (route && mapRef.current) {
        const midIdx = Math.floor(route.coords.length / 2);
        const [midLng, midLat] = route.coords[midIdx];
        mapRef.current.animateToRegion(
          { latitude: midLat, longitude: midLng, latitudeDelta: 0.5, longitudeDelta: 0.5 },
          800
        );
      }
    } catch {
      // location or network failure — silently clear loading
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const clearRoute = () => {
    setRouteData(null);
    setRouteDestName(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MapLayer
        mapRef={mapRef}
        locations={results}
        selectedId={selectedId}
        isDark={isDark}
        mapType={mapType}
        droppedPin={droppedPin}
        routeCoords={routeData?.coords ?? null}
        onMapPress={droppingPin ? (lat, lng) => { setDroppedPin({ lat, lng }); setDroppingPin(false); } : undefined}
        onMarkerPress={handleMarkerPress}
        onCalloutPress={navigateToLocation}
        onDirectionsPress={handleDirections}
      />

      {/* Search & Filter overlay */}
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
                  style={[styles.layerItem, mapType === "standard" && { backgroundColor: colors.primary + "18" }]}
                  onPress={() => { setMapType("standard"); setShowLayerMenu(false); }}
                >
                  <Ionicons name="map" size={15} color={mapType === "standard" ? colors.primary : colors.foreground} />
                  <Text style={[styles.layerItemText, { color: mapType === "standard" ? colors.primary : colors.foreground }]}>Default</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.layerItem, mapType === "satellite" && { backgroundColor: colors.primary + "18" }]}
                  onPress={() => { setMapType("satellite"); setShowLayerMenu(false); }}
                >
                  <Ionicons name="earth" size={15} color={mapType === "satellite" ? colors.primary : colors.foreground} />
                  <Text style={[styles.layerItemText, { color: mapType === "satellite" ? colors.primary : colors.foreground }]}>Satellite</Text>
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

      {/* Route info card */}
      {(isLoadingRoute || routeData) && !droppedPin && (
        <View style={[styles.routeCard, { backgroundColor: colors.card, borderColor: colors.border, bottom: BOTTOM_BASE + 16 }]}>
          {isLoadingRoute ? (
            <View style={styles.routeCardRow}>
              <View style={[styles.routeIconWrap, { backgroundColor: colors.primary + "18" }]}>
                <Ionicons name="navigate-circle-outline" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.routeCardText, { color: colors.mutedForeground }]}>Finding route…</Text>
            </View>
          ) : routeData ? (
            <View style={styles.routeCardRow}>
              <View style={[styles.routeIconWrap, { backgroundColor: colors.primary + "18" }]}>
                <Ionicons name="navigate" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.routeCardDest, { color: colors.foreground }]} numberOfLines={1}>
                  {routeDestName}
                </Text>
                <Text style={[styles.routeCardMeta, { color: colors.mutedForeground }]}>
                  {routeData.durationMin} min · {routeData.distanceMi.toFixed(1)} mi · Driving
                </Text>
              </View>
              <TouchableOpacity onPress={clearRoute} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Ionicons name="close-circle" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}

      {/* Dropped pin card */}
      {droppedPin && (
        <View
          style={[
            styles.pinCard,
            { backgroundColor: colors.card, borderColor: colors.border, bottom: BOTTOM_BASE + 16 },
          ]}
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
              if (Platform.OS !== "web") Haptics.selectionAsync();
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
      <View
        style={[styles.addBtnWrap, { bottom: BOTTOM_BASE }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            if (droppingPin) {
              setDroppingPin(false);
            } else {
              setDroppedPin(null);
              clearRoute();
              setDroppingPin(true);
            }
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
  logoImg: { width: 150, height: 50 },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    gap: 8,
  },
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
  routeCard: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  routeCardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  routeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  routeCardDest: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  routeCardMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  routeCardText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
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
});
