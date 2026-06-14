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
import { useAuth, SubscriptionTier } from "@/contexts/AuthContext";

type PlanId = "premium" | "business";

const PLANS: {
  id: PlanId;
  name: string;
  price: string;
  billing: string;
  tagline: string;
  features: { icon: string; mat?: boolean; text: string }[];
  color: string;
  icon: string;
  highlight?: boolean;
}[] = [
  {
    id: "premium",
    name: "Driver Premium",
    price: "$9.99",
    billing: "/month",
    tagline: "For professional drivers who want more out of every route",
    features: [
      { icon: "filter", text: "Advanced category & amenity filters" },
      { icon: "bookmark", text: "Save unlimited favorite locations" },
      { icon: "notifications", text: "Dock wait-time alerts & notifications" },
      { icon: "map", text: "Offline maps for no-signal zones" },
      { icon: "navigate", text: "Route planning with truck restrictions" },
      { icon: "shield-checkmark", text: "Driver Verified badge eligibility" },
      { icon: "gas-station", mat: true, text: "Truck stop, CAT scale & weigh station POIs" },
      { icon: "ban", text: "Ad-free experience" },
      { icon: "headset", text: "Priority support" },
    ],
    color: "#4A9EE0",
    icon: "diamond-outline",
  },
  {
    id: "business",
    name: "Business / Fleet",
    price: "$29.99",
    billing: "/month",
    tagline: "For warehouses, fleets & businesses managing delivery locations",
    features: [
      { icon: "checkmark-circle", text: "Claim & manage your business location" },
      { icon: "create", text: "Update dock info, gate codes & receiving hours" },
      { icon: "image", text: "Upload official facility maps & photos" },
      { icon: "chatbubbles", text: "Respond to driver comments" },
      { icon: "bar-chart", text: "Driver feedback analytics dashboard" },
      { icon: "star", text: "Priority listing placement on map" },
      { icon: "ribbon", text: "Business Verified gold badge on your pin" },
      { icon: "people", text: "Fleet seat management (up to 25 drivers)" },
      { icon: "diamond-outline", text: "All Driver Premium features included" },
    ],
    color: "#F59E0B",
    icon: "business",
    highlight: true,
  },
];

const FREE_FEATURES = [
  "Search & browse all locations",
  "View basic location info",
  "Submit new locations (earn points)",
  "Community photos & comments",
  "Trust score & driver ratings",
];

const VERIFICATION_TIERS = [
  {
    icon: "people" as const,
    color: "#22C55E",
    label: "Community Trusted",
    desc: "Auto-awarded at 40+ upvotes and 90+ verification score. Free for all.",
  },
  {
    icon: "shield-checkmark" as const,
    color: "#4A9EE0",
    label: "Driver Verified",
    desc: "Earned by Premium drivers with a 95+ verification score. Included in Premium.",
  },
  {
    icon: "ribbon" as const,
    color: "#F59E0B",
    label: "Business Verified",
    desc: "Gold badge for businesses that claim & verify their location. Included in Business plan.",
  },
];

export default function PremiumScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, upgradeToTier } = useAuth();
  const [selected, setSelected] = useState<PlanId>("premium");
  const [showVerification, setShowVerification] = useState(false);

  const WEB_TOP = Platform.OS === "web" ? 67 : 0;

  const currentPlan = PLANS.find((p) => p.id === selected)!;
  const isBusinessPlan = user?.subscriptionTier === "business";
  const alreadyOnSelected =
    (selected === "premium" && (user?.subscriptionTier === "premium" || isBusinessPlan)) ||
    (selected === "business" && isBusinessPlan);

  const onSubscribe = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!user) { router.push("/auth"); return; }
    const tierMap: Record<PlanId, SubscriptionTier> = { premium: "premium", business: "business" };
    upgradeToTier(tierMap[selected]);
    router.back();
  };

  if (isBusinessPlan) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + WEB_TOP + 12, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={styles.alreadyWrap}>
          <View style={[styles.crownWrap, { backgroundColor: "#F59E0B22" }]}>
            <Ionicons name="business" size={40} color="#F59E0B" />
          </View>
          <Text style={[styles.alreadyTitle, { color: colors.foreground }]}>Business Plan Active</Text>
          <Text style={[styles.alreadySub, { color: colors.mutedForeground }]}>
            Your Business plan is active. Claim locations, update dock info, and manage driver feedback from your dashboard.
          </Text>
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: "#F59E0B" }]}
            onPress={() => { router.back(); router.push("/business-dashboard"); }}
            activeOpacity={0.85}
          >
            <Ionicons name="business" size={16} color="#fff" />
            <Text style={styles.doneBtnText}>Business Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 8 }}>
            <Text style={[styles.backLink, { color: colors.mutedForeground }]}>Back to App</Text>
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
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 130 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={[styles.crownWrap, { backgroundColor: "#F59E0B18" }]}>
            <MaterialCommunityIcons name="crown" size={38} color="#F59E0B" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>Upgrade EverStop</Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            Built for professional drivers and businesses who need more out of every delivery
          </Text>
        </View>

        {/* Plan selector */}
        <View style={styles.plans}>
          {PLANS.map((plan) => {
            const isSelected = selected === plan.id;
            return (
              <Pressable
                key={plan.id}
                onPress={() => setSelected(plan.id)}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: isSelected ? plan.color + "10" : colors.card,
                    borderColor: isSelected ? plan.color : colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
              >
                {plan.highlight && (
                  <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                    <Text style={styles.popularText}>Most Popular</Text>
                  </View>
                )}

                <View style={styles.planHeader}>
                  <View style={[styles.planIconWrap, { backgroundColor: plan.color + "18" }]}>
                    <Ionicons name={plan.icon as any} size={22} color={plan.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planName, { color: colors.foreground }]}>{plan.name}</Text>
                    <View style={styles.priceRow}>
                      <Text style={[styles.planPrice, { color: plan.color }]}>{plan.price}</Text>
                      <Text style={[styles.planBilling, { color: colors.mutedForeground }]}>{plan.billing}</Text>
                    </View>
                  </View>
                  <View style={[styles.selectCircle, { borderColor: isSelected ? plan.color : colors.border }]}>
                    {isSelected && <View style={[styles.selectFill, { backgroundColor: plan.color }]} />}
                  </View>
                </View>

                <Text style={[styles.planTagline, { color: colors.mutedForeground }]}>{plan.tagline}</Text>

                <View style={styles.featureList}>
                  {plan.features.map((f) => (
                    <View key={f.text} style={styles.featureRow}>
                      {f.mat
                        ? <MaterialCommunityIcons name={f.icon as any} size={15} color={plan.color} />
                        : <Ionicons name={f.icon as any} size={15} color={plan.color} />}
                      <Text style={[styles.featureText, { color: colors.foreground }]}>{f.text}</Text>
                    </View>
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Verification Program */}
        <Pressable
          onPress={() => setShowVerification((v) => !v)}
          style={[styles.verificationCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.verificationHeader}>
            <View style={[styles.verificationIconWrap, { backgroundColor: "#22C55E18" }]}>
              <Ionicons name="shield-checkmark" size={20} color="#22C55E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.verificationTitle, { color: colors.foreground }]}>Verification Program</Text>
              <Text style={[styles.verificationSub, { color: colors.mutedForeground }]}>Three trust tiers for locations & drivers</Text>
            </View>
            <Ionicons
              name={showVerification ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.mutedForeground}
            />
          </View>

          {showVerification && (
            <View style={styles.verificationTiers}>
              {VERIFICATION_TIERS.map((tier) => (
                <View key={tier.label} style={[styles.tierRow, { borderTopColor: colors.border }]}>
                  <View style={[styles.tierIcon, { backgroundColor: tier.color + "18" }]}>
                    <Ionicons name={tier.icon} size={16} color={tier.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tierLabel, { color: colors.foreground }]}>{tier.label}</Text>
                    <Text style={[styles.tierDesc, { color: colors.mutedForeground }]}>{tier.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Pressable>

        {/* Free plan */}
        <View style={[styles.freeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.freeTitle, { color: colors.foreground }]}>Free Plan Includes</Text>
          {FREE_FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Ionicons name="checkmark" size={15} color={colors.mutedForeground} />
              <Text style={[styles.featureText, { color: colors.mutedForeground }]}>{f}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.cta, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
        <Text style={[styles.ctaNote, { color: colors.mutedForeground }]}>
          Cancel anytime · Secure payment · 7-day free trial
        </Text>
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: alreadyOnSelected ? colors.muted : currentPlan.color }]}
          onPress={onSubscribe}
          activeOpacity={0.85}
          disabled={alreadyOnSelected}
        >
          <MaterialCommunityIcons name="crown" size={17} color="#fff" />
          <Text style={styles.ctaBtnText}>
            {alreadyOnSelected
              ? "Current Plan"
              : `Start ${currentPlan.name} — ${currentPlan.price}/mo`}
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
  scroll: { padding: 20, gap: 16 },
  heroSection: { alignItems: "center", gap: 10 },
  crownWrap: { width: 76, height: 76, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center" },
  heroSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  plans: { gap: 14 },
  planCard: { borderRadius: 16, padding: 16, gap: 12 },
  popularBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginBottom: -4 },
  popularText: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  planHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  planIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  planName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 2, marginTop: 2 },
  planPrice: { fontSize: 20, fontFamily: "Inter_700Bold" },
  planBilling: { fontSize: 12, fontFamily: "Inter_400Regular" },
  planTagline: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  selectCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  selectFill: { width: 12, height: 12, borderRadius: 6 },
  featureList: { gap: 9 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  verificationCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  verificationHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  verificationIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  verificationTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  verificationSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  verificationTiers: { gap: 0 },
  tierRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingTop: 10, borderTopWidth: 1 },
  tierIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 1 },
  tierLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  tierDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  freeCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 9 },
  freeTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cta: { padding: 16, paddingTop: 12, borderTopWidth: 1, gap: 8 },
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
  alreadyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  alreadyTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  alreadySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  doneBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8 },
  doneBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  backLink: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
