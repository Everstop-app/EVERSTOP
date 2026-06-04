import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Linking,
  Modal,
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
import { RatingStars } from "@/components/RatingStars";

/* ── types ── */
type Suggestion = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

type NearbyStop = DeliveryLocation & { distKm: number };

/* ── helpers ── */
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

function fmtMiles(km: number) {
  const mi = km * 0.621371;
  return mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;
}

function fmtDriveTime(km: number) {
  const hours = (km * 0.621371) / 55; // avg truck speed 55 mph
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function openMaps(address: string, city: string, state: string, zip: string) {
  const dest = encodeURIComponent(`${address}, ${city}, ${state} ${zip}`);
  const url =
    Platform.OS === "ios"
      ? `maps://?daddr=${dest}`
      : Platform.OS === "android"
      ? `geo:0,0?q=${dest}`
      : `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  Linking.openURL(url).catch(() =>
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}`)
  );
}

const CATEGORY_ICON: Record<string, { icon: string; color: string; bg: string }> = {
  Retail: { icon: "cart-outline", color: "#4A9EE0", bg: "#1A3A5C" },
  "Distribution Center": { icon: "cube-outline", color: "#22C55E", bg: "#0D2A1A" },
  Manufacturing: { icon: "construct-outline", color: "#F59E0B", bg: "#2A1A00" },
  Grocery: { icon: "nutrition-outline", color: "#22C55E", bg: "#0D2A1A" },
  Wholesale: { icon: "business-outline", color: "#A78BFA", bg: "#1E1A3A" },
};
function getCategoryStyle(cat: string) {
  return CATEGORY_ICON[cat] ?? { icon: "business-outline", color: "#7A8CA0", bg: "#1A2330" };
}

function ratingColor(r: number, n: number) {
  if (n === 0) return "#7A8CA0";
  if (r >= 4) return "#22C55E";
  if (r >= 3) return "#F59E0B";
  return "#EF4444";
}

/* ════════════════════════════════════
   Bottom Sheet
   ════════════════════════════════════ */
function StopSheet({
  stop,
  visible,
  onClose,
}: {
  stop: NearbyStop | null;
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(300)).current;
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : 300,
      duration: 280,
      useNativeDriver: true,
    }).start();
    if (!visible) setNavigating(false);
  }, [visible]);

  if (!stop) return null;

  const catStyle = getCategoryStyle(stop.category);
  const miles = (stop.distKm * 0.621371);
  const milesStr = fmtMiles(stop.distKm);
  const etaStr = fmtDriveTime(stop.distKm);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            paddingBottom: insets.bottom + 16,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Drag handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* ── Business "image" banner ── */}
        <View style={[styles.banner, { backgroundColor: catStyle.bg }]}>
          <View style={[styles.bannerIconCircle, { backgroundColor: catStyle.color + "33" }]}>
            <Ionicons name={catStyle.icon as any} size={40} color={catStyle.color} />
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.bannerCategory}>{stop.category}</Text>
            <Text style={styles.bannerName} numberOfLines={2}>
              {stop.companyName}
            </Text>
            <Text style={styles.bannerAddr} numberOfLines={1}>
              {stop.address}, {stop.city}, {stop.state} {stop.zipCode}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── Rating & trust row ── */}
        <View style={[styles.metaRow, { borderBottomColor: colors.border }]}>
          <RatingStars rating={stop.rating} ratingCount={stop.ratingCount} size={14} />
          <View style={styles.trustPill}>
            <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
            <Text style={[styles.trustTxt, { color: colors.primary }]}>{stop.trustScore}% trusted</Text>
          </View>
        </View>

        {/* ── Navigate info (shown when navigating tapped) ── */}
        {navigating ? (
          <View style={[styles.navInfo, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <View style={styles.navStat}>
              <Ionicons name="navigate" size={22} color={colors.primary} />
              <Text style={[styles.navStatValue, { color: colors.foreground }]}>{milesStr}</Text>
              <Text style={[styles.navStatLabel, { color: colors.mutedForeground }]}>away</Text>
            </View>
            <View style={[styles.navDivider, { backgroundColor: colors.border }]} />
            <View style={styles.navStat}>
              <Ionicons name="time-outline" size={22} color={colors.primary} />
              <Text style={[styles.navStatValue, { color: colors.foreground }]}>{etaStr}</Text>
              <Text style={[styles.navStatLabel, { color: colors.mutedForeground }]}>drive time</Text>
            </View>
            <View style={[styles.navDivider, { backgroundColor: colors.border }]} />
            <View style={styles.navStat}>
              <Ionicons name="speedometer-outline" size={22} color={colors.primary} />
              <Text style={[styles.navStatValue, { color: colors.foreground }]}>55 mph</Text>
              <Text style={[styles.navStatLabel, { color: colors.mutedForeground }]}>avg speed</Text>
            </View>
          </View>
        ) : null}

        {/* ── Action buttons ── */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              onClose();
              router.push(`/location/${stop.id}`);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="document-text-outline" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Delivery Info</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: navigating ? "#22C55E" : colors.secondary, borderWidth: 1, borderColor: navigating ? "#22C55E" : colors.border },
            ]}
            onPress={() => {
              if (!navigating) {
                setNavigating(true);
              } else {
                openMaps(stop.address, stop.city, stop.state, stop.zipCode);
              }
            }}
            activeOpacity={0.85}
          >
            <Ionicons name={navigating ? "navigate" : "navigate-outline"} size={18} color={navigating ? "#fff" : colors.foreground} />
            <Text style={[styles.actionBtnText, { color: navigating ? "#fff" : colors.foreground }]}>
              {navigating ? "Open Maps" : "Navigate"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

/* ════════════════════════════════════
   Main screen
   ════════════════════════════════════ */
export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { locations } = useLocations();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Suggestion | null>(null);
  const [nearbyStops, setNearbyStops] = useState<NearbyStop[]>([]);
  const [inputFocused, setInputFocused] = useState(false);
  const [activeStop, setActiveStop] = useState<NearbyStop | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const WEB_TOP = Platform.OS === "web" ? 67 : 0;

  /* ── Nominatim autocomplete ── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 3 || selectedPlace) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=us`,
          { headers: { "Accept-Language": "en", "User-Agent": "EverStopApp/1.0" } }
        );
        setSuggestions(await res.json());
      } catch { setSuggestions([]); }
      finally { setLoadingSuggestions(false); }
    }, 400);
  }, [query, selectedPlace]);

  /* ── pick suggestion → compute nearby ── */
  const pickSuggestion = useCallback((s: Suggestion) => {
    setSelectedPlace(s);
    setQuery(s.display_name);
    setSuggestions([]);
    const lat = parseFloat(s.lat);
    const lon = parseFloat(s.lon);
    const sorted = locations
      .map((loc) => ({ ...loc, distKm: haversineKm(lat, lon, loc.latitude, loc.longitude) }))
      .sort((a, b) => a.distKm - b.distKm);
    setNearbyStops(sorted);
  }, [locations]);

  const clearSearch = useCallback(() => {
    setQuery(""); setSuggestions([]); setSelectedPlace(null); setNearbyStops([]);
  }, []);

  const openStop = useCallback((stop: NearbyStop) => {
    setActiveStop(stop);
    setSheetVisible(true);
  }, []);

  const showDropdown = inputFocused && suggestions.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + WEB_TOP + 12, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Image source={require("@/assets/images/logo_transparent.png")} style={styles.logoImg} contentFit="contain" />
        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Find stops near an address</Text>

        {/* Address input */}
        <View style={[styles.inputWrap, { zIndex: 20 }]}>
          <View
            style={[
              styles.inputRow,
              { backgroundColor: colors.secondary, borderColor: inputFocused ? colors.primary : colors.border },
            ]}
          >
            <Ionicons name="location-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              value={query}
              onChangeText={(t) => { setQuery(t); if (selectedPlace) setSelectedPlace(null); }}
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

          {/* Autocomplete dropdown */}
          {showDropdown && (
            <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
            {nearbyStops.length} stop{nearbyStops.length !== 1 ? "s" : ""} · tap to view
          </Text>
        )}
      </View>

      {/* ── Results list ── */}
      {selectedPlace ? (
        <FlatList
          data={nearbyStops}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const catStyle = getCategoryStyle(item.category);
            return (
              <TouchableOpacity
                style={[styles.stopRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => openStop(item)}
                activeOpacity={0.82}
              >
                <View style={[styles.stopIcon, { backgroundColor: catStyle.bg }]}>
                  <Ionicons name={catStyle.icon as any} size={20} color={catStyle.color} />
                </View>
                <View style={styles.stopInfo}>
                  <Text style={[styles.stopName, { color: colors.foreground }]} numberOfLines={1}>
                    {item.companyName}
                  </Text>
                  <Text style={[styles.stopAddr, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {item.city}, {item.state} · {item.category}
                  </Text>
                  <View style={styles.stopMeta}>
                    <Ionicons name="star" size={11} color="#F59E0B" />
                    <Text style={[styles.stopRating, { color: colors.mutedForeground }]}>
                      {item.ratingCount > 0 ? item.rating.toFixed(1) : "No ratings"}
                    </Text>
                  </View>
                </View>
                <View style={styles.stopDist}>
                  <Text style={[styles.stopDistVal, { color: colors.primary }]}>{fmtMiles(item.distKm)}</Text>
                  <Text style={[styles.stopDistEta, { color: colors.mutedForeground }]}>{fmtDriveTime(item.distKm)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            );
          }}
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
            Type a city, state, or full address to find EverStop locations nearby.
          </Text>
        </View>
      )}

      {/* ── Bottom sheet ── */}
      <StopSheet
        stop={activeStop}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  );
}

/* ── Styles ── */
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, paddingBottom: 12, gap: 10 },
  logoImg: { width: 160, height: 52, marginHorizontal: 16 },
  sectionLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", paddingHorizontal: 16 },
  inputWrap: { paddingHorizontal: 16 },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, borderWidth: 1.5, height: 48,
  },
  inputIcon: { marginLeft: 12, marginRight: 4 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", paddingVertical: 0 },
  dropdown: {
    position: "absolute", top: 52, left: 0, right: 0,
    borderRadius: 12, borderWidth: 1, overflow: "hidden",
    elevation: 8, shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 8,
    zIndex: 100,
  },
  suggestionRow: {
    flexDirection: "row", alignItems: "flex-start",
    gap: 8, paddingHorizontal: 14, paddingVertical: 10,
  },
  suggestionText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  resultCount: { fontSize: 12, fontFamily: "Inter_400Regular", paddingHorizontal: 16 },

  /* stop list */
  list: { padding: 12 },
  stopRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8,
  },
  stopIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  stopInfo: { flex: 1 },
  stopName: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 19 },
  stopAddr: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  stopMeta: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  stopRating: { fontSize: 11, fontFamily: "Inter_400Regular" },
  stopDist: { alignItems: "flex-end" },
  stopDistVal: { fontSize: 13, fontFamily: "Inter_700Bold" },
  stopDistEta: { fontSize: 11, fontFamily: "Inter_400Regular" },

  /* empty */
  empty: { alignItems: "center", paddingTop: 80, gap: 10, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },

  /* bottom sheet */
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    overflow: "hidden",
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 4 },
  banner: {
    flexDirection: "row", alignItems: "center",
    gap: 12, padding: 16, paddingTop: 12,
  },
  bannerIconCircle: {
    width: 64, height: 64, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  bannerText: { flex: 1 },
  bannerCategory: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#7A8CA0", textTransform: "uppercase", letterSpacing: 0.5 },
  bannerName: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff", marginTop: 2, lineHeight: 21 },
  bannerAddr: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#7A8CA0", marginTop: 2 },
  closeBtn: { padding: 4, position: "absolute", top: 10, right: 14 },
  metaRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  trustPill: { flexDirection: "row", alignItems: "center", gap: 4 },
  trustTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  /* navigate info */
  navInfo: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-around",
    marginHorizontal: 16, marginTop: 12, borderRadius: 14, borderWidth: 1, padding: 14,
  },
  navStat: { alignItems: "center", gap: 3 },
  navStatValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  navStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  navDivider: { width: 1, height: 36 },

  /* action buttons */
  actions: {
    flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 14,
  },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, borderRadius: 14, paddingVertical: 14,
  },
  actionBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
