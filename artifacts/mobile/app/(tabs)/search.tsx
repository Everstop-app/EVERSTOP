import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useLocations } from "@/contexts/LocationsContext";
import { LocationCard } from "@/components/LocationCard";
import { FilterBar } from "@/components/FilterBar";
import { SearchBar } from "@/components/SearchBar";

export default function SearchScreen() {
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
        <Image
          source={require("@/assets/images/logo_transparent.png")}
          style={styles.logoImg}
          contentFit="contain"
        />
        <View style={styles.searchWrap}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search company, city, state..." />
        </View>
        <View style={styles.filterWrap}>
          <FilterBar filters={filters} onChange={setFilters} />
        </View>
        {(query.length > 0 || activeFilters > 0) && (
          <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
            {results.length} result{results.length !== 1 ? "s" : ""}
          </Text>
        )}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LocationCard location={item} />}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 + 34 : 90) },
        ]}
        scrollEnabled={!!results.length}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color={colors.mutedForeground} />
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
  logoImg: { width: 160, height: 52, marginHorizontal: 16 },
  searchWrap: {
    paddingHorizontal: 16,
  },
  filterWrap: {
    marginHorizontal: -4,
  },
  resultCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 16,
  },
  list: {
    padding: 16,
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
