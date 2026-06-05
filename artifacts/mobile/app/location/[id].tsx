import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useLocations } from "@/contexts/LocationsContext";
import { useAuth } from "@/contexts/AuthContext";
import { RatingStars } from "@/components/RatingStars";

const DIFFICULTY_CONFIG = {
  easy: { color: "#22C55E", label: "Easy backing", icon: "checkmark-circle" },
  moderate: { color: "#F59E0B", label: "Moderate backing", icon: "warning" },
  difficult: { color: "#EF4444", label: "Difficult backing", icon: "alert-circle" },
};

export default function LocationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getLocation, addComment, rateLocation } = useLocations();
  const { user, addPoints, toggleFavorite } = useAuth();

  const [commentText, setCommentText] = useState("");
  const [userRating, setUserRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "comments">("info");

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

  const diff = DIFFICULTY_CONFIG[location.turningDifficulty];

  const onFav = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  const onSubmitComment = () => {
    if (!user) { router.push("/auth"); return; }
    if (!commentText.trim()) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addComment(location.id, {
      userId: user.id,
      userName: user.name,
      text: commentText.trim(),
      rating: userRating || 0,
    });
    addPoints(10);
    setCommentText("");
    setUserRating(0);
    setActiveTab("comments");
  };

  const onRate = (rating: number) => {
    if (!user) { router.push("/auth"); return; }
    if (hasRated) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    rateLocation(location.id, rating);
    setHasRated(true);
    addPoints(5);
    setUserRating(rating);
  };

  const WEB_TOP = Platform.OS === "web" ? 67 : 0;

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

          <View style={styles.ratingRow}>
            <RatingStars rating={location.rating} ratingCount={location.ratingCount} size={15} />
            <View style={[styles.trustBadge, { backgroundColor: colors.secondary }]}>
              <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
              <Text style={[styles.trustText, { color: colors.primary }]}>{location.trustScore}% trust</Text>
            </View>
          </View>

          {/* Action buttons */}
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
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1 }]}
              onPress={() => setActiveTab(activeTab === "info" ? "comments" : "info")}
              activeOpacity={0.85}
            >
              <Ionicons name="chatbubble-outline" size={16} color={colors.foreground} />
              <Text style={[styles.actionBtnText, { color: colors.foreground }]}>{location.comments.length}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {(["info", "comments"] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                activeTab === tab && { borderBottomColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab ? colors.primary : colors.mutedForeground },
                ]}
              >
                {tab === "info" ? "Location Info" : `Comments (${location.comments.length})`}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === "info" ? (
          <View style={styles.infoSection}>
            {/* Turning difficulty banner */}
            <View style={[styles.diffBanner, { backgroundColor: diff.color + "18", borderColor: diff.color + "44" }]}>
              <Ionicons name={diff.icon as any} size={18} color={diff.color} />
              <Text style={[styles.diffText, { color: diff.color }]}>{diff.label}</Text>
            </View>

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
              <InfoRow icon="navigate" label="Backing Difficulty" value={diff.label} color={diff.color} />
              {location.dockType && <InfoRow icon="cube" label="Dock Type" value={location.dockType.replace("-", " ")} />}
              {location.dockNumber && <InfoRow icon="grid" label="Dock Numbers" value={location.dockNumber} />}
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
              {location.receivingHours && <InfoRow icon="time" label="Receiving Hours" value={location.receivingHours} />}
              <InfoRow icon="calendar" label="Appointment" value={location.requiresAppointment ? "Required" : "Walk-in OK"} />
              {location.contactPhone && <InfoRow icon="call" label="Contact" value={location.contactPhone} />}
              {location.specialInstructions && (
                <View style={[styles.instructions, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Ionicons name="information-circle" size={16} color={colors.primary} />
                  <Text style={[styles.instructionsText, { color: colors.foreground }]}>{location.specialInstructions}</Text>
                </View>
              )}
            </View>

            {/* Rate this location */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Rate This Location</Text>
              {hasRated ? (
                <View style={styles.ratedRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                  <Text style={[styles.ratedText, { color: "#22C55E" }]}>Thanks! You earned 5 points</Text>
                </View>
              ) : (
                <>
                  <Text style={[styles.ratePrompt, { color: colors.mutedForeground }]}>Tap to rate this delivery location</Text>
                  <RatingStars rating={userRating} size={32} interactive onRate={onRate} />
                </>
              )}
            </View>

            <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>Submitted by {location.submittedByName}</Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>Updated {location.lastUpdated}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.commentsSection}>
            {/* Add comment */}
            <View style={[styles.commentForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Add Comment</Text>
              <RatingStars rating={userRating} size={22} interactive onRate={(r) => setUserRating(r)} />
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Share your experience at this location..."
                placeholderTextColor={colors.mutedForeground}
                style={[styles.commentInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                multiline
                maxLength={400}
              />
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: commentText.trim() ? colors.primary : colors.muted }]}
                onPress={onSubmitComment}
                disabled={!commentText.trim()}
                activeOpacity={0.85}
              >
                <Ionicons name="send" size={14} color={commentText.trim() ? "#fff" : colors.mutedForeground} />
                <Text style={[styles.submitBtnText, { color: commentText.trim() ? "#fff" : colors.mutedForeground }]}>
                  Post Comment (+10 pts)
                </Text>
              </TouchableOpacity>
            </View>

            {location.comments.length === 0 ? (
              <View style={styles.emptyComments}>
                <Ionicons name="chatbubble-outline" size={36} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No comments yet. Be the first!</Text>
              </View>
            ) : (
              location.comments.map((c) => (
                <View key={c.id} style={[styles.commentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.commentHeader}>
                    <View style={[styles.commenterAvatar, { backgroundColor: colors.primary + "22" }]}>
                      <Text style={[styles.commenterInitial, { color: colors.primary }]}>
                        {c.userName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.commenterName, { color: colors.foreground }]}>{c.userName}</Text>
                      <Text style={[styles.commentDate, { color: colors.mutedForeground }]}>{c.date}</Text>
                    </View>
                    {c.rating > 0 && <RatingStars rating={c.rating} size={12} />}
                  </View>
                  <Text style={[styles.commentText, { color: colors.foreground }]}>{c.text}</Text>
                </View>
              ))
            )}
          </View>
        )}
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
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  trustText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
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
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  infoSection: { padding: 16, gap: 12 },
  diffBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  diffText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
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
  ratePrompt: { fontSize: 13, fontFamily: "Inter_400Regular" },
  ratedRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ratedText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 12,
  },
  meta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  commentsSection: { padding: 16, gap: 12 },
  commentForm: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 80,
    textAlignVertical: "top",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
  },
  submitBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emptyComments: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  commentCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  commenterAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  commenterInitial: { fontSize: 16, fontFamily: "Inter_700Bold" },
  commenterName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  commentDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  commentText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  photoGallery: { gap: 10, paddingVertical: 2 },
  photoThumb: { width: 120, height: 120, borderRadius: 12 },
});
