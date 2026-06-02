import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { DeliveryLocation } from "@/contexts/LocationsContext";
import { RatingStars } from "./RatingStars";

interface LocationCardProps {
  location: DeliveryLocation;
  compact?: boolean;
}

const DIFFICULTY_CONFIG = {
  easy: { color: "#22C55E", label: "Easy" },
  moderate: { color: "#F59E0B", label: "Moderate" },
  difficult: { color: "#EF4444", label: "Difficult" },
};

export function LocationCard({ location, compact = false }: LocationCardProps) {
  const colors = useColors();
  const { user, toggleFavorite } = useAuth();
  const isFav = user?.favoriteLocations.includes(location.id) ?? false;

  const onPress = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    router.push(`/location/${location.id}`);
  };

  const onFav = (e: any) => {
    e.stopPropagation?.();
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (user) toggleFavorite(location.id);
    else router.push("/auth");
  };

  const diff = DIFFICULTY_CONFIG[location.turningDifficulty];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.company, { color: colors.foreground }]} numberOfLines={1}>
            {location.companyName}
          </Text>
          <Text style={[styles.address, { color: colors.mutedForeground }]} numberOfLines={1}>
            {location.city}, {location.state} · {location.category}
          </Text>
        </View>
        <Pressable onPress={onFav} style={styles.favBtn} hitSlop={8}>
          <Ionicons
            name={isFav ? "bookmark" : "bookmark-outline"}
            size={20}
            color={isFav ? colors.primary : colors.mutedForeground}
          />
        </Pressable>
      </View>

      <View style={styles.ratingRow}>
        <RatingStars rating={location.rating} ratingCount={location.ratingCount} size={13} />
        <View style={[styles.trustBadge, { backgroundColor: colors.secondary }]}>
          <Ionicons name="shield-checkmark" size={11} color={colors.primary} />
          <Text style={[styles.trustText, { color: colors.primary }]}>{location.trustScore}%</Text>
        </View>
      </View>

      {!compact && (
        <View style={styles.badges}>
          {location.overnightParking && (
            <View style={[styles.badge, { backgroundColor: "#1A3A5C" }]}>
              <Ionicons name="moon" size={11} color="#4A9EE0" />
              <Text style={[styles.badgeText, { color: "#4A9EE0" }]}>Overnight</Text>
            </View>
          )}
          {location.scaleAvailable && (
            <View style={[styles.badge, { backgroundColor: "#1A3A2A" }]}>
              <MaterialCommunityIcons name="scale-balance" size={11} color="#22C55E" />
              <Text style={[styles.badgeText, { color: "#22C55E" }]}>Scale</Text>
            </View>
          )}
          {location.restroomsAvailable && (
            <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
              <Ionicons name="water" size={11} color={colors.mutedForeground} />
              <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>Restrooms</Text>
            </View>
          )}
          <View style={[styles.badge, { backgroundColor: diff.color + "22" }]}>
            <Ionicons name="navigate" size={11} color={diff.color} />
            <Text style={[styles.badgeText, { color: diff.color }]}>{diff.label} backing</Text>
          </View>
        </View>
      )}

      {!compact && location.receivingHours && (
        <View style={styles.hoursRow}>
          <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />
          <Text style={[styles.hours, { color: colors.mutedForeground }]} numberOfLines={1}>
            {location.receivingHours}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={[styles.updated, { color: colors.mutedForeground }]}>
          Updated {location.lastUpdated}
        </Text>
        <View style={styles.footerRight}>
          <Ionicons name="chatbubble-outline" size={12} color={colors.mutedForeground} />
          <Text style={[styles.commentCount, { color: colors.mutedForeground }]}>
            {location.comments.length}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: { flex: 1, marginRight: 8 },
  company: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
  },
  address: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  favBtn: { padding: 2 },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 20,
  },
  trustText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  hours: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  updated: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  footerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  commentCount: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
