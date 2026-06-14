import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useLocations, DeliveryLocation } from "@/contexts/LocationsContext";

export default function BusinessDashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getLocation } = useLocations();

  const WEB_TOP = Platform.OS === "web" ? 67 : 0;
  const isBusiness = user?.subscriptionTier === "business";

  const claimedLocations: DeliveryLocation[] = (user?.claimedLocationIds ?? [])
    .map((id) => getLocation(id))
    .filter((l): l is DeliveryLocation => l != null);

  const totalRatings = claimedLocations.reduce((s, l) => s + l.ratingCount, 0);
  const avgRating =
    claimedLocations.length > 0
      ? (claimedLocations.reduce((s, l) => s + l.rating, 0) / claimedLocations.length).toFixed(1)
      : "—";
  const totalComments = claimedLocations.reduce((s, l) => s + l.comments.length, 0);
  const totalUpvotes = claimedLocations.reduce((s, l) => s + l.upvotes, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + WEB_TOP + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Business Dashboard</Text>
        {isBusiness ? (
          <View style={[styles.verifiedPill, { backgroundColor: "#F59E0B18" }]}>
            <Ionicons name="ribbon" size={13} color="#F59E0B" />
            <Text style={[styles.verifiedText, { color: "#F59E0B" }]}>Verified</Text>
          </View>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Upgrade nudge for non-business users */}
        {!isBusiness && (
          <TouchableOpacity
            style={[styles.upgradeCard, { backgroundColor: "#1A2533", borderColor: "#F59E0B33" }]}
            onPress={() => router.push("/premium")}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="crown" size={20} color="#F59E0B" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.upgradeTitle]}>Upgrade to Business Plan</Text>
              <Text style={[styles.upgradeSub]}>
                Claim locations, update dock info, and earn your Business Verified badge — $29.99/mo
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#F59E0B" />
          </TouchableOpacity>
        )}

        {/* Stats grid */}
        {claimedLocations.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Overview</Text>
            <View style={styles.statsGrid}>
              {[
                { icon: "location", label: "Claimed", value: claimedLocations.length.toString(), color: colors.primary },
                { icon: "star", label: "Avg Rating", value: avgRating, color: "#F59E0B" },
                { icon: "people", label: "Ratings", value: totalRatings.toString(), color: "#22C55E" },
                { icon: "chatbubbles", label: "Comments", value: totalComments.toString(), color: "#8B5CF6" },
                { icon: "thumbs-up", label: "Upvotes", value: totalUpvotes.toString(), color: "#06B6D4" },
              ].map((s) => (
                <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name={s.icon as any} size={18} color={s.color} />
                  <Text style={[styles.statNum, { color: colors.foreground }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Claimed locations */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Locations</Text>
            {isBusiness && (
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primary + "18" }]}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/add-location");
                }}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={[styles.addBtnText, { color: colors.primary }]}>Add Location</Text>
              </TouchableOpacity>
            )}
          </View>

          {claimedLocations.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="business-outline" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No locations claimed</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                Find your business on the map, open the location page, and tap "Claim This Location."
              </Text>
              <TouchableOpacity
                style={[styles.findBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.back()}
                activeOpacity={0.85}
              >
                <Ionicons name="search" size={16} color="#fff" />
                <Text style={styles.findBtnText}>Search for My Location</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.locationList}>
              {claimedLocations.map((loc) => (
                <ClaimedLocationCard key={loc.id} loc={loc} isBusiness={isBusiness} colors={colors} />
              ))}
            </View>
          )}
        </View>

        {/* Tips */}
        <View style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={16} color="#F59E0B" />
            <Text style={[styles.tipsTitle, { color: colors.foreground }]}>Tips for a Better Driver Experience</Text>
          </View>
          {[
            "Keep dock hours and check-in instructions up to date",
            "Upload photos of your entrance, dock area, and overnight lot",
            "Add gate codes and access point details for faster access",
            "Respond to driver comments to build trust and rating",
            "Set special instructions for peak receiving windows",
          ].map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <View style={[styles.tipDot, { backgroundColor: "#F59E0B" }]} />
              <Text style={[styles.tipText, { color: colors.mutedForeground }]}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function ClaimedLocationCard({
  loc,
  isBusiness,
  colors,
}: {
  loc: DeliveryLocation;
  isBusiness: boolean;
  colors: any;
}) {
  const [open, setOpen] = useState(false);
  const isVerified = loc.claimedByBusiness?.verified;

  return (
    <View
      style={[
        styles.locCard,
        {
          backgroundColor: colors.card,
          borderColor: isVerified ? "#F59E0B44" : colors.border,
        },
      ]}
    >
      <TouchableOpacity onPress={() => setOpen((v) => !v)} activeOpacity={0.85}>
        <View style={styles.locCardHeader}>
          <View style={[styles.catDot, { backgroundColor: loc.categoryColor ?? "#7A8CA0" }]} />
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={[styles.locName, { color: colors.foreground }]} numberOfLines={1}>
                {loc.companyName}
              </Text>
              {isVerified && <Ionicons name="ribbon" size={14} color="#F59E0B" />}
            </View>
            <Text style={[styles.locAddr, { color: colors.mutedForeground }]} numberOfLines={1}>
              {loc.city}, {loc.state} · {loc.category}
            </Text>
          </View>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
        </View>

        <View style={styles.locMeta}>
          {[
            { icon: "star", val: loc.rating.toFixed(1), color: "#F59E0B" },
            { icon: "chatbubble", val: loc.comments.length.toString(), color: colors.mutedForeground },
            { icon: "thumbs-up", val: loc.upvotes.toString(), color: "#22C55E" },
            { icon: "shield-checkmark", val: `${loc.trustScore}%`, color: colors.primary },
          ].map((s) => (
            <View key={s.icon} style={styles.locMetaItem}>
              <Ionicons name={s.icon as any} size={12} color={s.color} />
              <Text style={[styles.locMetaVal, { color: colors.foreground }]}>{s.val}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>

      {open && (
        <View style={[styles.locExpanded, { borderTopColor: colors.border }]}>
          {loc.comments.length > 0 ? (
            <>
              <Text style={[styles.commentsLabel, { color: colors.mutedForeground }]}>Recent driver comments</Text>
              {loc.comments.slice(0, 2).map((c) => (
                <View key={c.id} style={[styles.commentChip, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.commentUser, { color: colors.foreground }]}>{c.userName}</Text>
                  <Text style={[styles.commentText, { color: colors.mutedForeground }]} numberOfLines={2}>{c.text}</Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={[styles.noComments, { color: colors.mutedForeground }]}>No driver comments yet.</Text>
          )}

          <View style={styles.locActions}>
            <TouchableOpacity
              style={[styles.locAction, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}
              onPress={() => router.push(`/location/${loc.id}`)}
            >
              <Ionicons name="eye" size={15} color={colors.primary} />
              <Text style={[styles.locActionText, { color: colors.primary }]}>View Page</Text>
            </TouchableOpacity>
            {isBusiness && (
              <TouchableOpacity
                style={[styles.locAction, { backgroundColor: "#F59E0B12", borderColor: "#F59E0B30" }]}
                onPress={() =>
                  Alert.alert(
                    "Edit Location",
                    "Full in-line editing is coming soon. For now, open the location page to update dock info and photos."
                  )
                }
              >
                <Ionicons name="create" size={15} color="#F59E0B" />
                <Text style={[styles.locActionText, { color: "#F59E0B" }]}>Edit Info</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  verifiedText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 16, gap: 20 },
  upgradeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  upgradeTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#F59E0B", marginBottom: 3 },
  upgradeSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#F59E0B99", lineHeight: 17 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCard: {
    minWidth: "30%",
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
    gap: 4,
  },
  statNum: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  findBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  findBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  locationList: { gap: 10 },
  locCard: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 8 },
  locCardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  locName: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  locAddr: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  locMeta: { flexDirection: "row", gap: 14 },
  locMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  locMetaVal: { fontSize: 12, fontFamily: "Inter_500Medium" },
  locExpanded: { borderTopWidth: 1, paddingTop: 10, gap: 8 },
  commentsLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  commentChip: { borderRadius: 8, borderWidth: 1, padding: 8, gap: 2 },
  commentUser: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  commentText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  noComments: { fontSize: 12, fontFamily: "Inter_400Regular" },
  locActions: { flexDirection: "row", gap: 8 },
  locAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  locActionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  tipsCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  tipsHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  tipsTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  tipDot: { width: 5, height: 5, borderRadius: 3, marginTop: 6 },
  tipText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
});
