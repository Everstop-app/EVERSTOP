import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth, POINTS_FOR_RANK, UserRank } from "@/contexts/AuthContext";
import { useLocations } from "@/contexts/LocationsContext";
import { LocationCard } from "@/components/LocationCard";

const RANKS: UserRank[] = [
  "Rookie Driver",
  "Road Warrior",
  "Professional Driver",
  "Elite Contributor",
  "Master Navigator",
];

const RANK_ICONS: Record<UserRank, string> = {
  "Rookie Driver": "shield-outline",
  "Road Warrior": "shield-half",
  "Professional Driver": "shield",
  "Elite Contributor": "shield-checkmark",
  "Master Navigator": "ribbon",
};

const RANK_COLORS: Record<UserRank, string> = {
  "Rookie Driver": "#7A8CA0",
  "Road Warrior": "#22C55E",
  "Professional Driver": "#4A9EE0",
  "Elite Contributor": "#A855F7",
  "Master Navigator": "#F59E0B",
};

const BUSINESS_RANK_LABELS: Record<UserRank, string> = {
  "Rookie Driver": "New Listing",
  "Road Warrior": "Local Business",
  "Professional Driver": "Verified Vendor",
  "Elite Contributor": "Trusted Partner",
  "Master Navigator": "Community Hub",
};

const BUSINESS_RANK_ICONS: Record<UserRank, string> = {
  "Rookie Driver": "storefront-outline",
  "Road Warrior": "storefront",
  "Professional Driver": "ribbon-outline",
  "Elite Contributor": "ribbon",
  "Master Navigator": "trophy",
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, updateUser } = useAuth();
  const { locations, filteredLocations } = useLocations();

  const WEB_TOP = Platform.OS === "web" ? 67 : 0;

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[styles.guestHeader, { paddingTop: insets.top + WEB_TOP + 24 }]}
        >
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.muted }]}>
            <Ionicons name="person" size={40} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.guestTitle, { color: colors.foreground }]}>Join EverStop</Text>
          <Text style={[styles.guestSub, { color: colors.mutedForeground }]}>
            Create an account to save locations, earn points, and contribute to the community
          </Text>
          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/auth")}
            activeOpacity={0.85}
          >
            <Text style={styles.loginBtnText}>Sign In / Register</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Linking.openURL("https://www.everstop.app/privacypolicy")}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Text style={[styles.privacyLink, { color: colors.primary }]}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentRankIndex = RANKS.indexOf(user.rank);
  const nextRank = RANKS[currentRankIndex + 1] as UserRank | undefined;
  const pointsForNext = nextRank ? POINTS_FOR_RANK[nextRank] : null;
  const pointsForCurrent = POINTS_FOR_RANK[user.rank];
  const progress = pointsForNext
    ? (user.points - pointsForCurrent) / (pointsForNext - pointsForCurrent)
    : 1;

  const myLocations = locations.filter((l) => l.submittedBy === user.id || l.submittedByName === user.name).slice(0, 5);
  const allResults = filteredLocations("");
  const favorites = allResults.filter((l) => user.favoriteLocations.includes(l.id));

  const isCustomer = user.accountType === "customer";
  const rankColor = RANK_COLORS[user.rank];
  const rankIcon = isCustomer ? BUSINESS_RANK_ICONS[user.rank] : RANK_ICONS[user.rank];
  const rankLabel = isCustomer ? BUSINESS_RANK_LABELS[user.rank] : user.rank;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 + 34 : 90) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + WEB_TOP + 16, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.avatarRow}>
          <TouchableOpacity
            onPress={async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled && result.assets) {
                updateUser({ imageUrl: result.assets[0].uri });
              }
            }}
            style={[styles.avatar, { backgroundColor: rankColor + "22", borderColor: rankColor }]}
            activeOpacity={0.85}
          >
            {user.imageUrl ? (
              <Image source={{ uri: user.imageUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarInitial, { color: rankColor }]}>
                {user.name.charAt(0).toUpperCase()}
              </Text>
            )}
            <View style={styles.avatarOverlay}>
              <Ionicons name="camera" size={18} color="#fff" />
            </View>
          </TouchableOpacity>
          <View style={styles.nameBlock}>
            <Text style={[styles.name, { color: colors.foreground }]}>{user.name}</Text>
            <View style={styles.rankRow}>
              <Ionicons name={rankIcon as any} size={14} color={rankColor} />
              <Text style={[styles.rank, { color: rankColor }]}>{rankLabel}</Text>
            </View>
            <Text style={[styles.accountType, { color: colors.mutedForeground }]}>
              {user.accountType === "driver" ? "Driver Account" : "Customer Account"}
            </Text>
          </View>
        </View>

        {/* Points progress */}
        <View style={[styles.pointsCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.pointsRow}>
            <View>
              <Text style={[styles.pointsNum, { color: colors.foreground }]}>{user.points.toLocaleString('en-US')}</Text>
              <Text style={[styles.pointsLabel, { color: colors.mutedForeground }]}>Points earned</Text>
            </View>
            {nextRank && (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.nextRankText, { color: colors.mutedForeground }]}>Next: {nextRank}</Text>
                <Text style={[styles.nextRankPoints, { color: colors.foreground }]}>
                  {pointsForNext! - user.points} pts to go
                </Text>
              </View>
            )}
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: rankColor },
              ]}
            />
          </View>
          {!user.isPremium && (
            <TouchableOpacity
              style={[styles.premiumBanner, { backgroundColor: "#1A2533", borderColor: "#F59E0B33" }]}
              onPress={() => router.push("/premium")}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="crown" size={16} color="#F59E0B" />
              <Text style={[styles.premiumText, { color: "#F59E0B" }]}>Upgrade to Premium · Offline maps, advanced filters</Text>
              <Ionicons name="chevron-forward" size={14} color="#F59E0B" />
            </TouchableOpacity>
          )}
          {user.subscriptionTier === "business" && (
            <TouchableOpacity
              style={[styles.premiumBanner, { backgroundColor: "#1A2533", borderColor: "#F59E0B33" }]}
              onPress={() => router.push("/business-dashboard")}
              activeOpacity={0.85}
            >
              <Ionicons name="ribbon" size={16} color="#F59E0B" />
              <Text style={[styles.premiumText, { color: "#F59E0B" }]}>Business Plan Active · View Dashboard</Text>
              <Ionicons name="chevron-forward" size={14} color="#F59E0B" />
            </TouchableOpacity>
          )}
          {user.subscriptionTier === "premium" && (
            <View style={[styles.premiumBanner, { backgroundColor: "#1A2533", borderColor: "#F59E0B33" }]}>
              <MaterialCommunityIcons name="crown" size={16} color="#F59E0B" />
              <Text style={[styles.premiumText, { color: "#F59E0B" }]}>Driver Premium · All features unlocked</Text>
            </View>
          )}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { icon: "location", label: isCustomer ? "Listed" : "Submitted", value: user.locationsSubmitted },
            { icon: "camera", label: "Photos", value: user.photosUploaded },
            { icon: isCustomer ? "star" : "checkmark-circle", label: isCustomer ? "Reviews" : "Verified", value: user.verificationsCompleted },
            { icon: "bookmark", label: "Saved", value: user.favoriteLocations.length },
          ].map((stat) => (
            <View key={stat.label} style={[styles.stat, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name={stat.icon as any} size={18} color={colors.primary} />
              <Text style={[styles.statNum, { color: colors.foreground }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Customer: Add Your Business */}
      {isCustomer && (
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Business</Text>
          <Text style={[styles.businessSub, { color: colors.mutedForeground }]}>
            Help truck drivers find your location, dock access, parking, and check-in info. Earn points for every submission.
          </Text>
          <TouchableOpacity
            style={[styles.addBusinessBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/add-location");
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.addBusinessBtnText}>Add a Business Location</Text>
          </TouchableOpacity>
          {myLocations.length > 0 && (
            <View style={{ gap: 8, marginTop: 4 }}>
              <Text style={[styles.rankItemPts, { color: colors.mutedForeground }]}>Your submissions</Text>
              {myLocations.map((loc) => (
                <LocationCard key={loc.id} location={loc} compact />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Ranks */}
      <View style={[styles.section, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{isCustomer ? "Business Ranks" : "Driver Ranks"}</Text>
        {isCustomer && (
          <Text style={[styles.businessSub, { color: colors.mutedForeground }]}>
            Add locations, photos, and reviews to climb the ranks and become a trusted community partner.
          </Text>
        )}
        <View style={styles.rankList}>
          {RANKS.map((r, idx) => {
            const isCurrentRank = r === user.rank;
            const isUnlocked = idx <= currentRankIndex;
            const rc = RANK_COLORS[r];
            const icon = isCustomer ? BUSINESS_RANK_ICONS[r] : RANK_ICONS[r];
            const label = isCustomer ? BUSINESS_RANK_LABELS[r] : r;
            return (
              <View
                key={r}
                style={[
                  styles.rankItem,
                  {
                    backgroundColor: isCurrentRank ? rc + "15" : colors.card,
                    borderColor: isCurrentRank ? rc : colors.border,
                  },
                ]}
              >
                <Ionicons name={icon as any} size={18} color={isUnlocked ? rc : colors.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rankItemName, { color: isUnlocked ? colors.foreground : colors.mutedForeground }]}>{label}</Text>
                  <Text style={[styles.rankItemPts, { color: colors.mutedForeground }]}>{POINTS_FOR_RANK[r].toLocaleString('en-US')} pts</Text>
                </View>
                {isCurrentRank && (
                  <View style={[styles.currentBadge, { backgroundColor: rc }]}>
                    <Text style={styles.currentBadgeText}>Current</Text>
                  </View>
                )}
                {isUnlocked && !isCurrentRank && (
                  <Ionicons name="checkmark-circle" size={16} color={rc} />
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Saved locations */}
      {favorites.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Saved Locations</Text>
          {favorites.slice(0, 3).map((loc) => (
            <LocationCard key={loc.id} location={loc} compact />
          ))}
          {favorites.length > 3 && (
            <Pressable onPress={() => router.push("/(tabs)/search")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all {favorites.length} saved →</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Account actions */}
      <View style={[styles.accountActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.accountBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => Linking.openURL("https://www.everstop.app/privacypolicy")}
        >
          <Ionicons name="document-text-outline" size={20} color={colors.foreground} />
          <Text style={[styles.accountBtnText, { color: colors.foreground }]}>Privacy Policy</Text>
          <Ionicons name="open-outline" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.accountBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            logout();
            router.replace("/auth");
          }}
        >
          <Ionicons name="swap-horizontal-outline" size={20} color={colors.foreground} />
          <Text style={[styles.accountBtnText, { color: colors.foreground }]}>Change Account</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.accountBtn, styles.logoutRow, { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" }]}
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            logout();
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={[styles.accountBtnText, { color: "#DC2626" }]}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 0 },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 14,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 24,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  nameBlock: { flex: 1, gap: 3 },
  name: { fontSize: 20, fontFamily: "Inter_700Bold" },
  rankRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  rank: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  accountType: { fontSize: 12, fontFamily: "Inter_400Regular" },
  accountActions: {
    padding: 16,
    paddingBottom: 32,
    gap: 10,
    borderTopWidth: 1,
  },
  accountBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  logoutRow: {
    justifyContent: "center",
  },
  accountBtnText: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  pointsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  pointsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  pointsNum: { fontSize: 28, fontFamily: "Inter_700Bold", lineHeight: 32 },
  pointsLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  nextRankText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  nextRankPoints: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  progressBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  premiumBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  premiumText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  statsRow: { flexDirection: "row", gap: 8 },
  stat: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
    gap: 4,
  },
  statNum: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  rankList: { gap: 8 },
  rankItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  rankItemName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  rankItemPts: { fontSize: 12, fontFamily: "Inter_400Regular" },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  currentBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  seeAll: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },
  businessSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  addBusinessBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  addBusinessBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  guestHeader: {
    flex: 1,
    alignItems: "center",
    padding: 32,
    gap: 16,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  guestTitle: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  guestSub: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  loginBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  loginBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  privacyLink: { fontSize: 14, fontFamily: "Inter_500Medium", textDecorationLine: "underline" },
});
