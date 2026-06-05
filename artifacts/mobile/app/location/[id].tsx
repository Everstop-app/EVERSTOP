import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useLocations } from "@/contexts/LocationsContext";
import { useAuth } from "@/contexts/AuthContext";

export default function LocationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getLocation } = useLocations();
  const { user, toggleFavorite } = useAuth();

  const location = getLocation(id ?? "");
  const isFav = user?.favoriteLocations.includes(id ?? "") ?? false;

  if (!location) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.notFound}>
          <Ionicons name="location-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.notFoundText, { color: colors.foreground }]}>Location not found</Text>
        </View>
      </View>
    );
  }

  const onFav = () => {
    if (!user) { router.push("/auth"); return; }
    toggleFavorite(location.id);
  };

  const onCallPhone = () => {
    if (location.contactPhone) {
      Linking.openURL(`tel:${location.contactPhone.replace(/\D/g, "")}`);
    }
  };

  const onNavigate = () => {
    const url = Platform.OS === "ios"
      ? `maps://maps.apple.com/?daddr=${location.latitude},${location.longitude}`
      : `https://maps.google.com/?daddr=${location.latitude},${location.longitude}`;
    Linking.openURL(url);
  };

  const InfoRow = ({ icon, label, value, color }: { icon: string; label: string; value: string; color?: string }) => (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: colors.secondary }]}>
        <Ionicons name={icon as any} size={16} color={color ?? colors.primary} />
      </View>
      <View style={styles.infoText}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) }}
      >
        {/* Hero header */}
        <View style={[styles.hero, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.heroActions}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.backBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            >
              <Ionicons name="arrow-back" size={20} color={colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onFav}
              style={[styles.backBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            >
              <Ionicons name={isFav ? "bookmark" : "bookmark-outline"} size={20} color={isFav ? colors.primary : colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={[styles.heroIcon, { backgroundColor: colors.primary + "18" }]}>
            <Ionicons name="business" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.heroName, { color: colors.foreground }]}>{location.companyName}</Text>
          <Text style={[styles.heroAddress, { color: colors.mutedForeground }]}>
            {location.address}, {location.city}, {location.state} {location.zipCode}
          </Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={onNavigate}
              activeOpacity={0.85}
            >
              <Ionicons name="navigate" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Navigate</Text>
            </TouchableOpacity>
            {location.contactPhone && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1 }]}
                onPress={onCallPhone}
                activeOpacity={0.85}
              >
                <Ionicons name="call" size={16} color={colors.foreground} />
                <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Call</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Info section */}
        <View style={styles.infoSection}>
          {/* Quick badges */}
          <View style={styles.quickBadges}>
            {[
              { show: location.restroomsAvailable, icon: "water", label: "Restrooms", color: "#4A9EE0" },
              { show: location.vendingMachines, icon: "fast-food", label: "Vending Machines", color: "#F59E0B" },
              { show: location.overnightParking, icon: "moon", label: "Overnight Parking", color: "#4A9EE0" },
              { show: location.scaleAvailable, icon: "scale-balance", label: "Scale Available", color: "#22C55E", material: true },
              { show: location.openAllDay, icon: "time", label: "Open 24/7", color: "#22C55E" },
              { show: location.requiresAppointment, icon: "calendar", label: "Appt Required", color: "#F59E0B" },
              { show: location.parkingAvailable, icon: "car", label: "Parking", color: "#4A9EE0" },
            ].filter((b) => b.show).map((b) => (
              <View key={b.label} style={[styles.quickBadge, { backgroundColor: b.color + "18", borderColor: b.color + "44" }]}>
                {b.material ? (
                  <MaterialCommunityIcons name={b.icon as any} size={13} color={b.color} />
                ) : (
                  <Ionicons name={b.icon as any} size={13} color={b.color} />
                )}
                <Text style={[styles.quickBadgeText, { color: b.color }]}>{b.label}</Text>
              </View>
            ))}
          </View>

          {location.photos && location.photos.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoGallery}>
                {location.photos.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={styles.photoThumb} />
                ))}
              </ScrollView>
            </View>
          )}

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Truck Information</Text>
            {location.bestEntrance && <InfoRow icon="enter" label="Best Entrance" value={location.bestEntrance} />}
            {location.checkInLocation && <InfoRow icon="clipboard" label="Check-In" value={location.checkInLocation} />}
          </View>

          {location.additionalInfo && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Additional Information</Text>
              <View style={[styles.instructions, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Ionicons name="information-circle" size={16} color={colors.primary} />
                <Text style={[styles.instructionsText, { color: colors.foreground }]}>{location.additionalInfo}</Text>
              </View>
            </View>
          )}

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Delivery Information</Text>
            {location.daySchedule && (
              <View style={{ gap: 6, marginBottom: 8 }}>
                {[
                  { key: "mon", label: "Mon" },
                  { key: "tue", label: "Tue" },
                  { key: "wed", label: "Wed" },
                  { key: "thu", label: "Thu" },
                  { key: "fri", label: "Fri" },
                  { key: "sat", label: "Sat" },
                  { key: "sun", label: "Sun" },
                ].map((d) => {
                  const day = location.daySchedule![d.key as keyof typeof location.daySchedule];
                  if (!day || !day.open) return null;
                  return (
                    <View key={d.key} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground, width: 36 }}>{d.label}</Text>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>{day.hours}</Text>
                    </View>
                  );
                })}
              </View>
            )}
            <InfoRow icon="calendar" label="Appointment" value={location.requiresAppointment ? "Required" : "Walk-in OK"} />
            {location.contactPhone && <InfoRow icon="call" label="Contact" value={location.contactPhone} />}
            {location.specialInstructions && (
              <View style={[styles.instructions, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Ionicons name="information-circle" size={16} color={colors.primary} />
                <Text style={[styles.instructionsText, { color: colors.foreground }]}>{location.specialInstructions}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFoundText: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  hero: {
    padding: 20,
    paddingTop: 16,
    gap: 10,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  heroActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  heroName: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  heroAddress: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  infoSection: { padding: 16, gap: 12 },
  quickBadges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  infoRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 1 },
  instructions: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  instructionsText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  photoGallery: { gap: 10, paddingVertical: 2 },
  photoThumb: { width: 120, height: 120, borderRadius: 12 },
});
