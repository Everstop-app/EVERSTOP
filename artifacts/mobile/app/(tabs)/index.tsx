import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useListWeighStationStatuses, useSetWeighStationStatus, getListWeighStationStatusesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { MapLayer } from "@/components/MapLayer";
import { SearchBar } from "@/components/SearchBar";
import { useColors } from "@/hooks/useColors";
import { useLocations } from "@/contexts/LocationsContext";
import { fetchRoutes, type RouteData } from "@/utils/mapboxRouting";
import { fetchRouteHazards, type Hazard } from "@/utils/routeHazards";
import { startNativeNavigation, type NavStop } from "@/utils/nativeNavigation";
import { fetchWeighStationsAlongRoute, type WeighStation } from "@/utils/weighStations";
import { fetchPoisAlongRoute, POI_CATEGORIES, type Poi, type PoiCategory } from "@/utils/poiSearch";

function HazardChip({ color, symbol, label }: { color: string; symbol: string; label: string }) {
  return (
    <View style={[styles.hazardChip, { backgroundColor: color + "1A" }]}>
      <Text style={[styles.hazardChipSymbol, { color }]}>{symbol}</Text>
      <Text style={[styles.hazardChipLabel, { color }]}>{label}</Text>
    </View>
  );
}

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

  const [routeOptions, setRouteOptions] = useState<RouteData[]>([]);
  const [routeHazardsByRoute, setRouteHazardsByRoute] = useState<Hazard[][]>([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [routeDestName, setRouteDestName] = useState<string | null>(null);
  const [routeDestCoord, setRouteDestCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [loadingHazards, setLoadingHazards] = useState(false);
  const [waypoints, setWaypoints] = useState<NavStop[]>([]);

  const [weighStationsByRoute, setWeighStationsByRoute] = useState<WeighStation[][]>([]);
  const [showPoiMenu, setShowPoiMenu] = useState(false);
  const [poiCategory, setPoiCategory] = useState<PoiCategory | null>(null);
  const [poiResults, setPoiResults] = useState<Poi[]>([]);
  const [loadingPois, setLoadingPois] = useState(false);
  const [addedPois, setAddedPois] = useState<Poi[]>([]);

  const queryClient = useQueryClient();
  const { data: weighStationStatuses } = useListWeighStationStatuses();
  const setWeighStationStatusMutation = useSetWeighStationStatus();
  const weighStationStatusMap: Record<string, "open" | "closed" | undefined> = {};
  (weighStationStatuses ?? []).forEach((s) => { weighStationStatusMap[s.osmId] = s.status as "open" | "closed"; });

  const selectedRoute = routeOptions[selectedRouteIdx] ?? null;
  const selectedHazards = routeHazardsByRoute[selectedRouteIdx] ?? [];
  const selectedWeighStations = weighStationsByRoute[selectedRouteIdx] ?? [];

  const region = useRef({
    latitude: 39.5,
    longitude: -98.35,
    latitudeDelta: 30,
    longitudeDelta: 30,
  });
  const [locatingMe, setLocatingMe] = useState(false);

  const mapRef = useRef<any>(null);
  const results = filteredLocations(query);

  const zoomBy = (factor: number) => {
    const r = region.current;
    const next = {
      ...r,
      latitudeDelta: Math.max(0.002, Math.min(60, r.latitudeDelta * factor)),
      longitudeDelta: Math.max(0.002, Math.min(60, r.longitudeDelta * factor)),
    };
    region.current = next;
    mapRef.current?.animateToRegion(next, 250);
  };

  const zoomIn = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    zoomBy(0.5);
  };
  const zoomOut = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    zoomBy(2);
  };

  const locateMe = async () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setLocatingMe(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      region.current = next;
      mapRef.current?.animateToRegion(next, 600);
    } finally {
      setLocatingMe(false);
    }
  };

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

  const focusRoute = (route: RouteData) => {
    if (!route || !mapRef.current) return;
    const midIdx = Math.floor(route.coords.length / 2);
    const [midLng, midLat] = route.coords[midIdx];
    mapRef.current.animateToRegion(
      { latitude: midLat, longitude: midLng, latitudeDelta: 0.5, longitudeDelta: 0.5 },
      800
    );
  };

  const handleDirections = async (id: string, lat: number, lng: number) => {
    const loc = results.find((l) => l.id === id);
    setRouteDestName(loc?.companyName ?? null);
    setRouteDestCoord({ lat, lng });
    setIsLoadingRoute(true);
    setRouteOptions([]);
    setRouteHazardsByRoute([]);
    setWeighStationsByRoute([]);
    setSelectedRouteIdx(0);
    setWaypoints([]);
    setAddedPois([]);
    setDroppedPin(null);
    setLoadingHazards(false);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setIsLoadingRoute(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const routes = await fetchRoutes(pos.coords.latitude, pos.coords.longitude, lat, lng);
      setRouteOptions(routes);
      setIsLoadingRoute(false);

      if (routes[0]) focusRoute(routes[0]);

      if (routes.length > 0) {
        setLoadingHazards(true);
        Promise.all(routes.map((r) => fetchRouteHazards(r.coords))).then((all) => {
          setRouteHazardsByRoute(all);
          setLoadingHazards(false);
        });
        Promise.all(routes.map((r) => fetchWeighStationsAlongRoute(r.coords))).then((all) => {
          setWeighStationsByRoute(all);
        });
      }
    } catch {
      setIsLoadingRoute(false);
    }
  };

  const selectRoute = (idx: number) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setSelectedRouteIdx(idx);
    const route = routeOptions[idx];
    if (route) focusRoute(route);
  };

  const handleStartNavigation = () => {
    if (!routeDestCoord) return;
    if (Platform.OS !== "web") Haptics.selectionAsync();
    startNativeNavigation(
      { lat: routeDestCoord.lat, lng: routeDestCoord.lng, label: routeDestName ?? undefined },
      waypoints
    );
  };

  const toggleWeighStationStatus = (osmId: string, current: "open" | "closed" | undefined) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    const next = current === "open" ? "closed" : "open";
    setWeighStationStatusMutation.mutate(
      { osmId, data: { status: next } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListWeighStationStatusesQueryKey() }) }
    );
  };

  const openPoiCategory = async (category: PoiCategory) => {
    if (!selectedRoute) return;
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setPoiCategory(category);
    setShowPoiMenu(false);
    setLoadingPois(true);
    setPoiResults([]);
    const pois = await fetchPoisAlongRoute(category, selectedRoute.coords);
    setPoiResults(pois);
    setLoadingPois(false);
  };

  const addPoiWaypoint = async (poi: Poi) => {
    if (!routeDestCoord) return;
    if (Platform.OS !== "web") Haptics.selectionAsync();
    const nextAdded = [...addedPois, poi];
    setAddedPois(nextAdded);
    setPoiCategory(null);
    setPoiResults([]);

    const nextWaypoints: NavStop[] = nextAdded.map((p) => ({ lat: p.lat, lng: p.lng, label: p.label }));
    setWaypoints(nextWaypoints);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const wpCoords: [number, number][] = nextAdded.map((p) => [p.lng, p.lat]);
      const routes = await fetchRoutes(
        pos.coords.latitude, pos.coords.longitude,
        routeDestCoord.lat, routeDestCoord.lng, wpCoords
      );
      if (routes.length > 0) {
        setRouteOptions(routes);
        setSelectedRouteIdx(0);
        focusRoute(routes[0]);
        setLoadingHazards(true);
        Promise.all(routes.map((r) => fetchRouteHazards(r.coords))).then((all) => {
          setRouteHazardsByRoute(all);
          setLoadingHazards(false);
        });
        Promise.all(routes.map((r) => fetchWeighStationsAlongRoute(r.coords))).then((all) => {
          setWeighStationsByRoute(all);
        });
      }
    } catch {
      // keep prior route if re-routing fails
    }
  };

  const clearRoute = () => {
    setRouteOptions([]);
    setRouteDestName(null);
    setRouteDestCoord(null);
    setRouteHazardsByRoute([]);
    setWeighStationsByRoute([]);
    setSelectedRouteIdx(0);
    setWaypoints([]);
    setAddedPois([]);
    setShowPoiMenu(false);
    setPoiCategory(null);
    setPoiResults([]);
    setLoadingHazards(false);
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
        routeCoords={selectedRoute?.coords ?? null}
        hazards={selectedHazards}
        weighStations={selectedWeighStations}
        weighStationStatus={weighStationStatusMap}
        onWeighStationTogglePress={toggleWeighStationStatus}
        pois={poiResults}
        onPoiAddPress={addPoiWaypoint}
        onMapPress={droppingPin ? (lat, lng) => { setDroppedPin({ lat, lng }); setDroppingPin(false); } : undefined}
        onMarkerPress={handleMarkerPress}
        onCalloutPress={navigateToLocation}
        onDirectionsPress={handleDirections}
        onRegionChangeComplete={(r) => { region.current = r; }}
      />

      {/* Zoom & locate controls */}
      <View style={[styles.mapControls, { bottom: BOTTOM_BASE + (routeOptions.length > 0 || isLoadingRoute ? 220 : 0) }]} pointerEvents="box-none">
        <View style={[styles.mapControlGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.mapControlBtn} onPress={zoomIn} activeOpacity={0.7}>
            <Ionicons name="add" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View style={[styles.mapControlDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.mapControlBtn} onPress={zoomOut} activeOpacity={0.7}>
            <Ionicons name="remove" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.mapControlGroup, styles.locateBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={locateMe}
          activeOpacity={0.7}
        >
          <Ionicons name={locatingMe ? "sync" : "locate"} size={19} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* POI waypoint button — visible during route review, ~1/3 down */}
      {routeOptions.length > 0 && !droppedPin && (
        <View style={styles.poiBtnWrap} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.poiBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowPoiMenu((v) => !v)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={22} color={colors.primary} />
          </TouchableOpacity>
          {showPoiMenu && (
            <View style={[styles.poiMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {POI_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={styles.poiMenuItem}
                  onPress={() => openPoiCategory(cat.key)}
                >
                  <Ionicons name={cat.icon as any} size={15} color={colors.foreground} />
                  <Text style={[styles.poiMenuItemText, { color: colors.foreground }]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* POI results panel */}
      {poiCategory && (
        <View style={[styles.poiResultsCard, { backgroundColor: colors.card, borderColor: colors.border, top: insets.top + WEB_TOP + 90 }]}>
          <View style={styles.routeCardHeaderRow}>
            <Text style={[styles.routeCardDest, { color: colors.foreground }]} numberOfLines={1}>
              {POI_CATEGORIES.find((c) => c.key === poiCategory)?.label ?? "Results"}
            </Text>
            <TouchableOpacity onPress={() => { setPoiCategory(null); setPoiResults([]); }} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Ionicons name="close-circle" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          {loadingPois ? (
            <Text style={[styles.routeCardText, { color: colors.mutedForeground, marginTop: 8 }]}>Searching nearby…</Text>
          ) : poiResults.length === 0 ? (
            <Text style={[styles.routeCardText, { color: colors.mutedForeground, marginTop: 8 }]}>Nothing found along this route</Text>
          ) : (
            <ScrollView style={styles.poiResultsList} showsVerticalScrollIndicator={false}>
              {poiResults.map((p) => (
                <TouchableOpacity key={p.id} style={styles.poiResultRow} onPress={() => addPoiWaypoint(p)} activeOpacity={0.8}>
                  <Ionicons name="pin" size={16} color={colors.primary} />
                  <Text style={[styles.poiResultText, { color: colors.foreground }]} numberOfLines={1}>{p.label}</Text>
                  <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

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

      {/* Route options card */}
      {(isLoadingRoute || routeOptions.length > 0) && !droppedPin && (
        <View style={[styles.routeCard, { backgroundColor: colors.card, borderColor: colors.border, bottom: BOTTOM_BASE + 16 }]}>
          {isLoadingRoute ? (
            <View style={styles.routeCardRow}>
              <View style={[styles.routeIconWrap, { backgroundColor: colors.primary + "18" }]}>
                <Ionicons name="navigate-circle-outline" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.routeCardText, { color: colors.mutedForeground }]}>Finding routes…</Text>
            </View>
          ) : routeOptions.length > 0 ? (
            <>
              <View style={styles.routeCardHeaderRow}>
                <Text style={[styles.routeCardDest, { color: colors.foreground }]} numberOfLines={1}>
                  {routeDestName}
                </Text>
                <TouchableOpacity onPress={clearRoute} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Ionicons name="close-circle" size={22} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              {loadingHazards && (
                <Text style={[styles.hazardScanText, { color: colors.mutedForeground }]}>
                  Scanning routes for hazards…
                </Text>
              )}
              <ScrollView style={styles.routeOptionsList} showsVerticalScrollIndicator={false}>
                {routeOptions.map((opt, idx) => {
                  const hz = routeHazardsByRoute[idx] ?? [];
                  const bridges = hz.filter((h) => h.type === "bridge").length;
                  const rr = hz.filter((h) => h.type === "railroad").length;
                  const selected = idx === selectedRouteIdx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.routeOptionCard,
                        {
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: selected ? colors.primary + "12" : "transparent",
                        },
                      ]}
                      onPress={() => selectRoute(idx)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.routeOptionRadio, { borderColor: selected ? colors.primary : colors.border }]}>
                        {selected && <View style={[styles.routeOptionRadioDot, { backgroundColor: colors.primary }]} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.routeOptionMeta, { color: colors.foreground }]}>
                          {idx === 0 ? "Fastest · " : `Option ${idx + 1} · `}
                          {opt.durationMin} min · {opt.distanceMi.toFixed(1)} mi
                        </Text>
                        {!loadingHazards ? (
                          bridges > 0 || rr > 0 ? (
                            <View style={styles.hazardChipsRow}>
                              {bridges > 0 && (
                                <HazardChip color="#F59E0B" symbol="⚠" label={`${bridges} Low Bridge${bridges > 1 ? "s" : ""}`} />
                              )}
                              {rr > 0 && (
                                <HazardChip color="#7C3AED" symbol="R" label={`${rr} RR Crossing${rr > 1 ? "s" : ""}`} />
                              )}
                            </View>
                          ) : (
                            <Text style={styles.routeOptionClear}>No known hazards</Text>
                          )
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                style={[styles.startNavBtn, { backgroundColor: colors.primary }]}
                onPress={handleStartNavigation}
                activeOpacity={0.85}
              >
                <Ionicons name="navigate" size={16} color="#fff" />
                <Text style={styles.startNavBtnText}>Start Navigation</Text>
              </TouchableOpacity>
            </>
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
  routeCardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  routeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  routeCardDest: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  routeCardMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  routeCardText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  routeOptionsList: { maxHeight: 190, marginTop: 8 },
  routeOptionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 10,
    marginBottom: 8,
  },
  routeOptionRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  routeOptionRadioDot: { width: 9, height: 9, borderRadius: 4.5 },
  routeOptionMeta: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  routeOptionClear: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#22C55E" },
  startNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 4,
  },
  startNavBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
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
  hazardScanText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
    fontStyle: "italic",
  },
  hazardChipsRow: { flexDirection: "row", gap: 6, paddingRight: 4 },
  hazardChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  hazardChipSymbol: { fontSize: 11, fontWeight: "700" },
  hazardChipLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  mapControls: {
    position: "absolute",
    right: 16,
    gap: 10,
    alignItems: "center",
  },
  mapControlGroup: {
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    overflow: "hidden",
  },
  mapControlBtn: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  mapControlDivider: {
    height: 1,
    width: "100%",
  },
  locateBtn: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  poiBtnWrap: {
    position: "absolute",
    right: 16,
    top: "33%",
  },
  poiBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  poiMenu: {
    position: "absolute",
    top: 50,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 170,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  poiMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  poiMenuItemText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  poiResultsCard: {
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
    maxHeight: 260,
  },
  poiResultsList: { marginTop: 8 },
  poiResultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
  },
  poiResultText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
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
