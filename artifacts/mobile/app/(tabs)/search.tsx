import { Ionicons } from "@expo/vector-icons";
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

/* ─── Types ─── */
type NominatimAddress = {
  house_number?: string;
  road?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  postcode?: string;
};

type Suggestion = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
};

type NearbyStop = DeliveryLocation & { distKm: number };

type SearchedAddress = {
  displayName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lon: number;
};

/* ─── Helpers ─── */
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
  const hours = (km * 0.621371) / 55;
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function openMapsToAddress(addr: SearchedAddress) {
  const dest = encodeURIComponent(`${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`.trim());
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

function openMapsToStop(stop: NearbyStop) {
  const dest = encodeURIComponent(`${stop.address}, ${stop.city}, ${stop.state} ${stop.zipCode}`);
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
  Retail:                { icon: "cart-outline",      color: "#4A9EE0", bg: "#1A3A5C" },
  "Distribution Center": { icon: "cube-outline",      color: "#22C55E", bg: "#0D2A1A" },
  Manufacturing:         { icon: "construct-outline", color: "#F59E0B", bg: "#2A1A00" },
  Grocery:               { icon: "nutrition-outline", color: "#22C55E", bg: "#0D2A1A" },
  Wholesale:             { icon: "business-outline",  color: "#A78BFA", bg: "#1E1A3A" },
};
function getCatStyle(cat: string) {
  return CATEGORY_ICON[cat] ?? { icon: "business-outline", color: "#7A8CA0", bg: "#1A2330" };
}

/* ════════════════════════════════════
   Raw Address Card — no EverStop data
   ════════════════════════════════════ */
function AddressCard({ addr, hasStops }: { addr: SearchedAddress; hasStops: boolean }) {
  const colors = useColors();
  const [showNav, setShowNav] = useState(false);

  return (
    <View style={[addrStyles.card, { backgroundColor: colors.card, borderColor: hasStops ? colors.border : colors.primary + "88" }]}>
      {/* Header */}
      <View style={addrStyles.header}>
        <View style={[addrStyles.iconBox, { backgroundColor: hasStops ? colors.secondary : "#1A3A5C" }]}>
          <Ionicons name="location" size={22} color={hasStops ? colors.mutedForeground : "#4A9EE0"} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[addrStyles.label, { color: colors.mutedForeground }]}>
            {hasStops ? "SEARCHED DESTINATION" : "NO EVERSTOP DATA YET"}
          </Text>
          <Text style={[addrStyles.addrLine, { color: colors.foreground }]} numberOfLines={1}>
            {addr.street || addr.displayName.split(",")[0]}
          </Text>
          <Text style={[addrStyles.addrSub, { color: colors.mutedForeground }]} numberOfLines={1}>
            {[addr.city, addr.state, addr.zip].filter(Boolean).join(", ")}
          </Text>
        </View>
      </View>

      {!hasStops && (
        <View style={[addrStyles.noDataBanner, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" }]}>
          <Ionicons name="information-circle-outline" size={15} color={colors.primary} />
          <Text style={[addrStyles.noDataText, { color: colors.primary }]}>
            Be the first to add delivery info for this location — help other drivers!
          </Text>
        </View>
      )}

      {/* Distance + ETA when shown */}
      {showNav && (
        <View style={[addrStyles.navRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <View style={addrStyles.navStat}>
            <Ionicons name="navigate" size={18} color={colors.primary} />
            <Text style={[addrStyles.navVal, { color: colors.foreground }]}>—</Text>
            <Text style={[addrStyles.navLbl, { color: colors.mutedForeground }]}>Use maps for exact distance</Text>
          </View>
        </View>
      )}

      {/* Action buttons */}
      <View style={addrStyles.actions}>
        <TouchableOpacity
          style={[addrStyles.btn, { backgroundColor: colors.primary }]}
          onPress={() => openMapsToAddress(addr)}
          activeOpacity={0.85}
        >
          <Ionicons name="navigate" size={16} color="#fff" />
          <Text style={addrStyles.btnTxt}>Navigate There</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[addrStyles.btn, { backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border }]}
          onPress={() =>
            router.push({
              pathname: "/add-location",
              params: {
                prefill_address: addr.street,
                prefill_city: addr.city,
                prefill_state: addr.state,
                prefill_zip: addr.zip,
                prefill_lat: String(addr.lat),
                prefill_lon: String(addr.lon),
              },
            })
          }
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle-outline" size={16} color={colors.foreground} />
          <Text style={[addrStyles.btnTxt, { color: colors.foreground }]}>
            {hasStops ? "Add Location" : "Add After Delivery"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const addrStyles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    gap: 10,
  },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  label: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 2 },
  addrLine: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 19 },
  addrSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  noDataBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 7,
    borderRadius: 10, borderWidth: 1, padding: 10,
  },
  noDataText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  navRow: {
    borderRadius: 12, borderWidth: 1, padding: 10,
  },
  navStat: { flexDirection: "row", alignItems: "center", gap: 6 },
  navVal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  navLbl: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 8 },
  btn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, borderRadius: 12, paddingVertical: 11,
  },
  btnTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
});

/* ════════════════════════════════════
   Stop bottom sheet
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
  const slideAnim = useRef(new Animated.Value(350)).current;
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : 350,
      duration: 280,
      useNativeDriver: true,
    }).start();
    if (!visible) setNavigating(false);
  }, [visible]);

  if (!stop) return null;
  const catStyle = getCatStyle(stop.category);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={sheet.backdrop} onPress={onClose} />
      <Animated.View
        style={[
          sheet.panel,
          { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + 16, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={[sheet.handle, { backgroundColor: colors.border }]} />

        {/* Banner */}
        <View style={[sheet.banner, { backgroundColor: catStyle.bg }]}>
          <View style={[sheet.bannerIcon, { backgroundColor: catStyle.color + "33" }]}>
            <Ionicons name={catStyle.icon as any} size={38} color={catStyle.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[sheet.bannerCat, { color: colors.mutedForeground }]}>{stop.category}</Text>
            <Text style={sheet.bannerName} numberOfLines={2}>{stop.companyName}</Text>
            <Text style={[sheet.bannerAddr, { color: colors.mutedForeground }]} numberOfLines={1}>
              {stop.address}, {stop.city}, {stop.state}
            </Text>
          </View>
          <TouchableOpacity style={sheet.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Rating */}
        <View style={[sheet.metaRow, { borderBottomColor: colors.border }]}>
          <RatingStars rating={stop.rating} ratingCount={stop.ratingCount} size={14} />
          <View style={sheet.trustPill}>
            <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
            <Text style={[sheet.trustTxt, { color: colors.primary }]}>{stop.trustScore}% trusted</Text>
          </View>
        </View>

        {/* Nav stats */}
        {navigating && (
          <View style={[sheet.navInfo, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <View style={sheet.navStat}>
              <Ionicons name="navigate" size={20} color={colors.primary} />
              <Text style={[sheet.navVal, { color: colors.foreground }]}>{fmtMiles(stop.distKm)}</Text>
              <Text style={[sheet.navLbl, { color: colors.mutedForeground }]}>away</Text>
            </View>
            <View style={[sheet.navDiv, { backgroundColor: colors.border }]} />
            <View style={sheet.navStat}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Text style={[sheet.navVal, { color: colors.foreground }]}>{fmtDriveTime(stop.distKm)}</Text>
              <Text style={[sheet.navLbl, { color: colors.mutedForeground }]}>drive time</Text>
            </View>
            <View style={[sheet.navDiv, { backgroundColor: colors.border }]} />
            <View style={sheet.navStat}>
              <Ionicons name="speedometer-outline" size={20} color={colors.primary} />
              <Text style={[sheet.navVal, { color: colors.foreground }]}>55 mph</Text>
              <Text style={[sheet.navLbl, { color: colors.mutedForeground }]}>avg</Text>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={sheet.actions}>
          <TouchableOpacity
            style={[sheet.btn, { backgroundColor: colors.primary }]}
            onPress={() => { onClose(); router.push(`/location/${stop.id}`); }}
            activeOpacity={0.85}
          >
            <Ionicons name="document-text-outline" size={17} color="#fff" />
            <Text style={sheet.btnTxt}>Delivery Info</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[sheet.btn, { backgroundColor: navigating ? "#22C55E" : colors.secondary, borderWidth: 1, borderColor: navigating ? "#22C55E" : colors.border }]}
            onPress={() => {
              if (!navigating) { setNavigating(true); }
              else { openMapsToStop(stop); }
            }}
            activeOpacity={0.85}
          >
            <Ionicons name={navigating ? "navigate" : "navigate-outline"} size={17} color={navigating ? "#fff" : colors.foreground} />
            <Text style={[sheet.btnTxt, { color: navigating ? "#fff" : colors.foreground }]}>
              {navigating ? "Open Maps" : "Navigate"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const sheet = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  panel: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    overflow: "hidden",
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 4 },
  banner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, paddingTop: 12 },
  bannerIcon: { width: 60, height: 60, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  bannerCat: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  bannerName: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff", marginTop: 2, lineHeight: 21 },
  bannerAddr: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  closeBtn: { position: "absolute", top: 10, right: 14, padding: 4 },
  metaRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  trustPill: { flexDirection: "row", alignItems: "center", gap: 4 },
  trustTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  navInfo: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-around",
    marginHorizontal: 16, marginTop: 12, borderRadius: 14, borderWidth: 1, padding: 12,
  },
  navStat: { alignItems: "center", gap: 3 },
  navVal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  navLbl: { fontSize: 11, fontFamily: "Inter_400Regular" },
  navDiv: { width: 1, height: 32 },
  actions: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 14 },
  btn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, borderRadius: 14, paddingVertical: 13,
  },
  btnTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
});

/* ════════════════════════════════════
   Main screen
   ════════════════════════════════════ */
export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { locations } = useLocations();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAddr, setSelectedAddr] = useState<SearchedAddress | null>(null);
  const [nearbyStops, setNearbyStops] = useState<NearbyStop[]>([]);
  const [inputFocused, setInputFocused] = useState(false);
  const [activeStop, setActiveStop] = useState<NearbyStop | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const WEB_TOP = Platform.OS === "web" ? 67 : 0;

  /* ── Nominatim autocomplete with address details ── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 3 || selectedAddr) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=us&addressdetails=1`,
          { headers: { "Accept-Language": "en", "User-Agent": "EverStopApp/1.0" } }
        );
        setSuggestions(await res.json());
      } catch { setSuggestions([]); }
      finally { setLoading(false); }
    }, 400);
  }, [query, selectedAddr]);

  /* ── Pick a suggestion ── */
  const pickSuggestion = useCallback((s: Suggestion) => {
    const a = s.address ?? {};
    const street = [a.house_number, a.road].filter(Boolean).join(" ");
    const city = a.city ?? a.town ?? a.village ?? "";
    const state = a.state ?? "";
    const zip = a.postcode ?? "";
    const lat = parseFloat(s.lat);
    const lon = parseFloat(s.lon);

    const addr: SearchedAddress = { displayName: s.display_name, street, city, state, zip, lat, lon };
    setSelectedAddr(addr);
    setQuery(s.display_name);
    setSuggestions([]);

    const sorted = locations
      .map((loc) => ({ ...loc, distKm: haversineKm(lat, lon, loc.latitude, loc.longitude) }))
      .sort((a, b) => a.distKm - b.distKm);
    setNearbyStops(sorted);
  }, [locations]);

  const clearSearch = useCallback(() => {
    setQuery(""); setSuggestions([]); setSelectedAddr(null); setNearbyStops([]);
  }, []);

  const showDropdown = inputFocused && suggestions.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + WEB_TOP + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Image source={require("@/assets/images/logo_transparent.png")} style={styles.logoImg} contentFit="contain" />
        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Find stops near an address</Text>

        {/* Address input */}
        <View style={[styles.inputWrap, { zIndex: 20 }]}>
          <View style={[styles.inputRow, { backgroundColor: colors.secondary, borderColor: inputFocused ? colors.primary : colors.border }]}>
            <Ionicons name="location-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              value={query}
              onChangeText={(t) => { setQuery(t); if (selectedAddr) setSelectedAddr(null); }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setTimeout(() => setInputFocused(false), 150)}
              placeholder="Enter city, state or full address…"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground }]}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="search"
            />
            {loading ? (
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
                  style={[styles.suggRow, i < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                >
                  <Ionicons name="location-outline" size={14} color={colors.primary} style={{ marginTop: 2 }} />
                  <Text style={[styles.suggText, { color: colors.foreground }]} numberOfLines={2}>{s.display_name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {selectedAddr && nearbyStops.length > 0 && (
          <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
            {nearbyStops.length} EverStop location{nearbyStops.length !== 1 ? "s" : ""} nearby · tap to view
          </Text>
        )}
      </View>

      {/* ── Body ── */}
      {selectedAddr ? (
        <FlatList
          data={nearbyStops}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <AddressCard addr={selectedAddr} hasStops={nearbyStops.length > 0} />
          }
          renderItem={({ item }) => {
            const cs = getCatStyle(item.category);
            return (
              <TouchableOpacity
                style={[styles.stopRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => { setActiveStop(item); setSheetVisible(true); }}
                activeOpacity={0.82}
              >
                <View style={[styles.stopIcon, { backgroundColor: cs.bg }]}>
                  <Ionicons name={cs.icon as any} size={20} color={cs.color} />
                </View>
                <View style={styles.stopInfo}>
                  <Text style={[styles.stopName, { color: colors.foreground }]} numberOfLines={1}>{item.companyName}</Text>
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
        />
      ) : (
        <View style={styles.empty}>
          <Ionicons name="map-outline" size={56} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Search by address</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Type a city, state, or full address to find EverStop locations nearby — or navigate directly to any address.
          </Text>
        </View>
      )}

      {/* ── Stop bottom sheet ── */}
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
  inputRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1.5, height: 48 },
  inputIcon: { marginLeft: 12, marginRight: 4 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", paddingVertical: 0 },
  dropdown: {
    position: "absolute", top: 52, left: 0, right: 0,
    borderRadius: 12, borderWidth: 1, overflow: "hidden",
    elevation: 8, shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 8,
    zIndex: 100,
  },
  suggRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  suggText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  resultCount: { fontSize: 12, fontFamily: "Inter_400Regular", paddingHorizontal: 16 },
  list: { padding: 12, gap: 0 },
  stopRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8, marginHorizontal: 0,
  },
  stopIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stopInfo: { flex: 1 },
  stopName: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 19 },
  stopAddr: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  stopMeta: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  stopRating: { fontSize: 11, fontFamily: "Inter_400Regular" },
  stopDist: { alignItems: "flex-end" },
  stopDistVal: { fontSize: 13, fontFamily: "Inter_700Bold" },
  stopDistEta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  empty: { alignItems: "center", paddingTop: 80, gap: 10, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
