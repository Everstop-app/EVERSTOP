import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useLocations, DeliveryLocation } from "@/contexts/LocationsContext";
import { LocationCard } from "@/components/LocationCard";

/* ── Nominatim geocode suggestion ── */
type Suggestion = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(km: number) {
  const mi = km * 0.621371;
  return mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;
}

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { locations } = useLocations();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Suggestion | null>(null);
  const [nearbyResults, setNearbyResults] = useState<(DeliveryLocation & { distKm: number })[]>([]);
  const [inputFocused, setInputFocused] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const WEB_TOP = Platform.OS === "web" ? 67 : 0;

  /* ── debounced Nominatim autocomplete ── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 3 || selectedPlace) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=us`,
          { headers: { "Accept-Language": "en", "User-Agent": "EverStopApp/1.0" } }
        );
        const data: Suggestion[] = await res.json();
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 400);
  }, [query, selectedPlace]);

  /* ── pick a suggestion ── */
  const pickSuggestion = useCallback(
    (s: Suggestion) => {
      setSelectedPlace(s);
      setQuery(s.display_name);
      setSuggestions([]);
      const lat = parseFloat(s.lat);
      const lon = parseFloat(s.lon);
      const sorted = locations
        .map((loc) => ({ ...loc, distKm: haversineKm(lat, lon, loc.latitude, loc.longitude) }))
        .sort((a, b) => a.distKm - b.distKm);
      setNearbyResults(sorted);
    },
    [locations]
  );

  /* ── clear search ── */
  const clearSearch = useCallback(() => {
    setQuery("");
    setSuggestions([]);
    setSelectedPlace(null);
    setNearbyResults([]);
  }, []);

  const showDropdown = inputFocused && suggestions.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
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

        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Find stops near an address</Text>

        {/* ── Address input ── */}
        <View style={styles.inputWrap}>
          <View
            style={[
              styles.inputRow,
              {
                backgroundColor: colors.secondary,
                borderColor: inputFocused ? colors.primary : colors.border,
              },
            ]}
          >
            <Ionicons name="location-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              value={query}
              onChangeText={(t) => {
                setQuery(t);
                if (selectedPlace) setSelectedPlace(null);
              }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setTimeout(() => setInputFocused(false), 150)}
              placeholder="Enter city, state or full address…"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground }]}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="search"
            />
            {loadingSuggestions ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 10 }} />
            ) : query.length > 0 ? (
              <TouchableOpacity onPress={clearSearch} hitSlop={8} style={{ marginRight: 10 }}>
                <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* ── Autocomplete dropdown ── */}
          {showDropdown && (
            <View
              style={[
                styles.dropdown,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {suggestions.map((s, i) => (
                <Pressable
                  key={s.place_id}
                  onPress={() => pickSuggestion(s)}
                  style={[
                    styles.suggestionRow,
                    i < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <Ionicons name="location-outline" size={14} color={colors.primary} style={{ marginTop: 2 }} />
                  <Text style={[styles.suggestionText, { color: colors.foreground }]} numberOfLines={2}>
                    {s.display_name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {selectedPlace && (
          <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
            {nearbyResults.length} stop{nearbyResults.length !== 1 ? "s" : ""} found — sorted by distance
          </Text>
        )}
      </View>

      {/* ── Results list ── */}
      {selectedPlace ? (
        <FlatList
          data={nearbyResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <TouchableOpacity onPress={() => router.push(`/location/${item.id}`)} activeOpacity={0.85}>
                <LocationCard location={item} />
              </TouchableOpacity>
              <View style={[styles.distBadge, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "55" }]}>
                <Ionicons name="navigate-outline" size={12} color={colors.primary} />
                <Text style={[styles.distText, { color: colors.primary }]}>{fmtDist(item.distKm)}</Text>
              </View>
            </View>
          )}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 + 34 : 90) },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="location-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No stops nearby</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No EverStop locations found near this address yet.
              </Text>
            </View>
          }
        />
      ) : (
        <View style={styles.empty}>
          <Ionicons name="map-outline" size={56} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Search by address</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Type a city, state, or full address above to find EverStop locations nearby.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    borderBottomWidth: 1,
    paddingBottom: 12,
    gap: 10,
    zIndex: 10,
  },
  logoImg: { width: 160, height: 52, marginHorizontal: 16 },
  sectionLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 16,
  },
  inputWrap: {
    paddingHorizontal: 16,
    zIndex: 20,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    height: 48,
  },
  inputIcon: { marginLeft: 12, marginRight: 4 },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingVertical: 0,
  },
  dropdown: {
    position: "absolute",
    top: 52,
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    zIndex: 100,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  resultCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 16,
  },
  list: { padding: 16, gap: 8 },
  cardWrap: { position: "relative", marginBottom: 8 },
  distBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  distText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
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
    lineHeight: 20,
  },
});
