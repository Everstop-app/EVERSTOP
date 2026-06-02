import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useRef, useState, useEffect } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MapLayer } from "@/components/MapLayer";
import { FilterBar } from "@/components/FilterBar";
import { SearchBar } from "@/components/SearchBar";
import { useColors } from "@/hooks/useColors";
import { useLocations } from "@/contexts/LocationsContext";

const RATING_COLORS: Record<string, string> = {
  high: "#22C55E",
  medium: "#F59E0B",
  low: "#EF4444",
  none: "#7A8CA0",
};

export default function MapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { filters, setFilters, filteredLocations } = useLocations();

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const mapRef = useRef<any>(null);
  const filterAnim = useRef(new Animated.Value(0)).current;

  const results = filteredLocations(query);
  const activeFilters = Object.values(filters).filter(Boolean).length;

  const WEB_TOP = Platform.OS === "web" ? 67 : 0;

  useEffect(() => {
    Animated.timing(filterAnim, {
      toValue: showFilters ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [showFilters]);

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MapLayer
        mapRef={mapRef}
        locations={results}
        selectedId={selectedId}
        isDark={isDark}
        onMarkerPress={handleMarkerPress}
        onCalloutPress={navigateToLocation}
      />

      {/* Search & Filter overlay */}
      <View
        style={[styles.overlay, { paddingTop: insets.top + WEB_TOP + 8 }]}
        pointerEvents="box-none"
      >
        {/* Logo row */}
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
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={[
              styles.filterBtn,
              {
                backgroundColor: activeFilters > 0 ? colors.primary : colors.card,
                borderColor: activeFilters > 0 ? colors.primary : colors.border,
              },
            ]}
            activeOpacity={0.8}
          >
            <Ionicons name="options" size={18} color={activeFilters > 0 ? "#fff" : colors.foreground} />
            {activeFilters > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilters}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <Animated.View
          style={[
            styles.filterBarWrap,
            {
              opacity: filterAnim,
              transform: [
                { translateY: filterAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) },
              ],
            },
          ]}
          pointerEvents={showFilters ? "auto" : "none"}
        >
          <FilterBar filters={filters} onChange={setFilters} />
        </Animated.View>

        <View style={styles.countRow} pointerEvents="none">
          <View style={[styles.countBadge, { backgroundColor: colors.card + "EE", borderColor: colors.border }]}>
            <Ionicons name="location" size={12} color={colors.primary} />
            <Text style={[styles.countText, { color: colors.foreground }]}>{results.length} locations</Text>
          </View>
        </View>
      </View>

      {/* Add button */}
      <View
        style={[
          styles.addBtnWrap,
          { bottom: insets.bottom + (Platform.OS === "web" ? 84 + 34 : 90) },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/add-location")}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View
        style={[
          styles.legend,
          {
            backgroundColor: colors.card + "EE",
            borderColor: colors.border,
            bottom: insets.bottom + (Platform.OS === "web" ? 84 + 34 : 90),
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
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#4A9EE0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
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
