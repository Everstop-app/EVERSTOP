import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
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
import { useAuth } from "@/contexts/AuthContext";

const PLANS = [
  {
    id: "premium",
    name: "Premium",
    price: "$9.99/mo",
    period: "monthly",
    features: [
      "Advanced search filters",
      "Offline maps",
      "Route planning",
      "Predictive AI routing — anticipates congestion and suggests alternatives before delays occur",
      "Live traffic and weather alerts to adjust travel plans",
      "Full location details",
      "Ad-free experience",
      "Priority support",
    ],
    color: "#4A9EE0",
    icon: "diamond-outline",
  },
  {
    id: "business",
    name: "Business",
    price: "$29.99/mo",
    period: "monthly",
    features: [
      "Claim business profile",
      "Update location info directly",
      "Respond to driver comments",
      "Analytics dashboard",
      "Priority listing placement",
      "All Premium features",
    ],
    color: "#F59E0B",
    icon: "business",
    highlight: true,
  },
];

export default function PremiumScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, upgradeToPremium } = useAuth();
  const [selected, setSelected] = useState("premium");

  const WEB_TOP = Platform.OS === "web" ? 67 : 0;

  const onSubscribe = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!user) { router.push("/auth"); return; }
    upgradeToPremium();
    router.back();
  };

  if (user?.isPremium) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + WEB_TOP + 12, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={styles.alreadyPremium}>
          <View style={[styles.crownWrap, { backgroundColor: "#F59E0B22" }]}>
            <MaterialCommunityIcons name="crown" size={48} color="#F59E0B" />
          </View>
          <Text style={[styles.alreadyTitle, { color: colors.foreground }]}>You're Premium!</Text>
          <Text style={[styles.alreadySub, { color: colors.mutedForeground }]}>
            All premium features are unlocked. Thank you for supporting EverStop.
          </Text>
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.doneBtnText}>Back to App</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + WEB_TOP + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={[styles.crownWrap, { backgroundColor: "#F59E0B18" }]}>
            <MaterialCommunityIcons name="crown" size={40} color="#F59E0B" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>Upgrade EverStop</Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            Join thousands of professional drivers getting more out of every delivery
          </Text>
        </View>

        <View style={styles.plans}>
          {PLANS.map((plan) => (
            <Pressable
              key={plan.id}
              onPress={() => setSelected(plan.id)}
              style={[
                styles.planCard,
                {
                  backgroundColor: selected === plan.id ? plan.color + "12" : colors.card,
                  borderColor: selected === plan.id ? plan.color : colors.border,
                  borderWidth: selected === plan.id ? 2 : 1,
                },
              ]}
            >
              {plan.highlight && (
                <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                  <Text style={styles.popularText}>Popular</Text>
                </View>
              )}
              <View style={styles.planHeader}>
                <View style={[styles.planIconWrap, { backgroundColor: plan.color + "18" }]}>
                  <Ionicons name={plan.icon as any} size={22} color={plan.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planName, { color: colors.foreground }]}>{plan.name}</Text>
                  <Text style={[styles.planPrice, { color: plan.color }]}>{plan.price}</Text>
                </View>
                <View style={[
                  styles.selectCircle,
                  { borderColor: selected === plan.id ? plan.color : colors.border },
                ]}>
                  {selected === plan.id && (
                    <View style={[styles.selectFill, { backgroundColor: plan.color }]} />
                  )}
                </View>
              </View>
              <View style={styles.features}>
                {plan.features.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={16} color={plan.color} />
                    <Text style={[styles.featureText, { color: colors.foreground }]}>{f}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          ))}
        </View>

        <View style={[styles.freeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.freeTitle, { color: colors.foreground }]}>Free Plan Includes</Text>
          {["Search locations", "View basic info", "Submit locations", "Earn points"].map((f) => (
            <View key={f} style={styles.featureRow}>
              <Ionicons name="checkmark" size={16} color={colors.mutedForeground} />
              <Text style={[styles.featureText, { color: colors.mutedForeground }]}>{f}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.cta, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
        <Text style={[styles.ctaNote, { color: colors.mutedForeground }]}>Cancel anytime · Secure payment</Text>
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: selected === "premium" ? "#4A9EE0" : "#F59E0B" }]}
          onPress={onSubscribe}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="crown" size={18} color="#fff" />
          <Text style={styles.ctaBtnText}>
            Start {PLANS.find((p) => p.id === selected)?.name} — {PLANS.find((p) => p.id === selected)?.price}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  scroll: { padding: 20, gap: 20 },
  heroSection: { alignItems: "center", gap: 10 },
  crownWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center" },
  heroSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  plans: { gap: 14 },
  planCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  popularBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: -4,
  },
  popularText: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  planHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  planIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  planName: { fontSize: 17, fontFamily: "Inter_700Bold" },
  planPrice: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  selectCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  selectFill: { width: 12, height: 12, borderRadius: 6 },
  features: { gap: 8 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  freeCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  freeTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cta: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  ctaNote: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
  },
  ctaBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  alreadyPremium: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  alreadyTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  alreadySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  doneBtn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 },
  doneBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
