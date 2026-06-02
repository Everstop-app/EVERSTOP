import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useLocations } from "@/contexts/LocationsContext";
import { LocationCard } from "@/components/LocationCard";
import { FilterBar } from "@/components/FilterBar";
import { SearchBar } from "@/components/SearchBar";

export default function MapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { filters, setFilters, filteredLocations } = useLocations();
  const [query, setQuery] = useState("");

  const WEB_TOP = Platform.OS === "web" ? 67 : 0;
  const results = filteredLocations(query);
  const activeFilters = Object.values(filters).filter(Boolean).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + WEB_TOP + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.titleRow}>
          <Image
            source={require("@/assets/images/logo_transparent.png")}
            style={styles.logoImg}
            contentFit="contain"
          />
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/add-location")}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.mapNotice}>
          <Ionicons name="phone-portrait-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.mapNoticeText, { color: colors.mutedForeground }]}>
            Scan QR in the URL bar to see the full map on your phone
          </Text>
        </View>
        <View style={styles.searchWrap}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search locations..." />
        </View>
        <View style={styles.filterWrap}>
          <FilterBar filters={filters} onChange={setFilters} />
        </View>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {results.length} location{results.length !== 1 ? "s" : ""}
          {activeFilters > 0 ? ` · ${activeFilters} filter${activeFilters !== 1 ? "s" : ""} active` : ""}
        </Text>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LocationCard location={item} />}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 84 + 34 },
        ]}
        scrollEnabled={!!results.length}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="location-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No locations found</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {activeFilters > 0 ? "Try removing some filters" : "Try a different search term"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    borderBottomWidth: 1,
    paddingBottom: 10,
    gap: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  logoImg: { width: 160, height: 52 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  mapNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
  },
  mapNoticeText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  searchWrap: { paddingHorizontal: 16 },
  filterWrap: { marginHorizontal: -4 },
  count: { fontSize: 12, fontFamily: "Inter_400Regular", paddingHorizontal: 16 },
  list: { padding: 16 },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
