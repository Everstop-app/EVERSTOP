import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useLocations } from "@/contexts/LocationsContext";

type Step = 0 | 1;

export default function ClaimLocationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, addClaimedLocation, upgradeToTier } = useAuth();
  const { getLocation, claimLocation } = useLocations();

  const location = getLocation(id ?? "");

  const [step, setStep] = useState<Step>(0);
  const [businessName, setBusinessName] = useState(location?.companyName ?? "");
  const [contactName, setContactName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(location?.contactPhone ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const WEB_TOP = Platform.OS === "web" ? 67 : 0;

  const canProceedStep0 = businessName.trim().length > 0 && contactName.trim().length > 0 && role.trim().length > 0;
  const canProceedStep1 = phone.trim().length > 0 || email.trim().length > 0;

  const onSubmit = () => {
    if (!user || !id) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitting(true);
    setTimeout(() => {
      claimLocation(id, user.id, businessName.trim());
      addClaimedLocation(id);
      if (user.subscriptionTier !== "business") {
        upgradeToTier("business");
      }
      setSubmitting(false);
      setDone(true);
    }, 1400);
  };

  if (!location) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + WEB_TOP + 12, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Claim Location</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.centered}>
          <Text style={[styles.mutedText, { color: colors.mutedForeground }]}>Location not found.</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + WEB_TOP + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Claim Location</Text>
        <View style={{ width: 22 }} />
      </View>

      {done ? (
        /* ── Success state ── */
        <View style={styles.successWrap}>
          <View style={[styles.successIcon, { backgroundColor: "#22C55E18" }]}>
            <Ionicons name="ribbon" size={52} color="#F59E0B" />
          </View>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>Claim Submitted!</Text>
          <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
            <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
              {location.companyName}
            </Text>{" "}
            is now claimed. Your Business Verified badge is active — update dock info, gate codes, and receiving hours from your dashboard.
          </Text>
          <TouchableOpacity
            style={[styles.successBtn, { backgroundColor: "#F59E0B" }]}
            onPress={() => { router.back(); router.push("/business-dashboard"); }}
            activeOpacity={0.85}
          >
            <Ionicons name="business" size={17} color="#fff" />
            <Text style={styles.successBtnText}>Open Business Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 6 }}>
            <Text style={[styles.mutedText, { color: colors.mutedForeground }]}>Back to Location</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 110 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Location preview chip */}
            <View style={[styles.locationChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.catDot, { backgroundColor: location.categoryColor ?? "#7A8CA0" }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.chipName, { color: colors.foreground }]} numberOfLines={1}>
                  {location.companyName}
                </Text>
                <Text style={[styles.chipAddr, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {location.address} · {location.city}, {location.state}
                </Text>
              </View>
            </View>

            {/* Step dots */}
            <View style={styles.stepDots}>
              {(["Business Info", "Contact"] as const).map((label, i) => (
                <React.Fragment key={label}>
                  <View style={styles.stepDotItem}>
                    <View style={[
                      styles.stepDotCircle,
                      { backgroundColor: i <= step ? colors.primary : colors.muted },
                    ]}>
                      {i < step
                        ? <Ionicons name="checkmark" size={12} color="#fff" />
                        : <Text style={styles.stepDotNum}>{i + 1}</Text>}
                    </View>
                    <Text style={[styles.stepDotLabel, { color: i <= step ? colors.foreground : colors.mutedForeground }]}>
                      {label}
                    </Text>
                  </View>
                  {i < 1 && <View style={[styles.stepDotLine, { backgroundColor: i < step ? colors.primary : colors.muted }]} />}
                </React.Fragment>
              ))}
            </View>

            {step === 0 && (
              <View style={styles.formBlock}>
                <Text style={[styles.formTitle, { color: colors.foreground }]}>Business Information</Text>
                <Text style={[styles.formSub, { color: colors.mutedForeground }]}>
                  Help drivers know who manages this location.
                </Text>
                {[
                  { label: "Business Name", value: businessName, set: setBusinessName, placeholder: "e.g. Walmart Distribution Center" },
                  { label: "Your Full Name", value: contactName, set: setContactName, placeholder: "Receiving manager or fleet coordinator" },
                  { label: "Your Role", value: role, set: setRole, placeholder: "e.g. Receiving Manager, Fleet Coordinator" },
                ].map((f) => (
                  <View key={f.label} style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                      {f.label} <Text style={{ color: "#EF4444" }}>*</Text>
                    </Text>
                    <TextInput
                      value={f.value}
                      onChangeText={f.set}
                      placeholder={f.placeholder}
                      placeholderTextColor={colors.mutedForeground}
                      style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    />
                  </View>
                ))}
              </View>
            )}

            {step === 1 && (
              <View style={styles.formBlock}>
                <Text style={[styles.formTitle, { color: colors.foreground }]}>Contact Details</Text>
                <Text style={[styles.formSub, { color: colors.mutedForeground }]}>
                  At least one contact method required so drivers can reach your dock.
                </Text>
                {[
                  { label: "Business Phone", value: phone, set: setPhone, placeholder: "(555) 000-0000", keyboard: "phone-pad" as const },
                  { label: "Business Email", value: email, set: setEmail, placeholder: "receiving@yourbusiness.com", keyboard: "email-address" as const },
                ].map((f) => (
                  <View key={f.label} style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{f.label}</Text>
                    <TextInput
                      value={f.value}
                      onChangeText={f.set}
                      placeholder={f.placeholder}
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType={f.keyboard}
                      autoCapitalize="none"
                      style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    />
                  </View>
                ))}

                <View style={[styles.infoBox, { backgroundColor: "#4A9EE018", borderColor: "#4A9EE033" }]}>
                  <Ionicons name="information-circle" size={16} color="#4A9EE0" />
                  <Text style={[styles.infoText, { color: "#4A9EE0" }]}>
                    Contact info appears on your location page to help drivers reach your dock.
                  </Text>
                </View>

                {/* Claim benefits summary */}
                <View style={[styles.benefitsCard, { backgroundColor: "#F59E0B0C", borderColor: "#F59E0B30" }]}>
                  <View style={styles.benefitsHeader}>
                    <Ionicons name="ribbon" size={16} color="#F59E0B" />
                    <Text style={[styles.benefitsTitle, { color: "#F59E0B" }]}>Business Verified Unlocks</Text>
                  </View>
                  {["Gold verified badge on your map pin", "Edit dock info, gate codes & hours", "Respond to driver comments", "Analytics dashboard", "All Driver Premium features"].map((b) => (
                    <View key={b} style={styles.benefitRow}>
                      <Ionicons name="checkmark-circle" size={14} color="#F59E0B" />
                      <Text style={[styles.benefitText, { color: colors.foreground }]}>{b}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer buttons */}
          <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
            {step > 0 && (
              <TouchableOpacity
                style={[styles.backBtn, { borderColor: colors.border }]}
                onPress={() => setStep(0)}
              >
                <Ionicons name="chevron-back" size={18} color={colors.foreground} />
                <Text style={[styles.backBtnText, { color: colors.foreground }]}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.nextBtn,
                {
                  backgroundColor: step === 1 ? "#F59E0B" : colors.primary,
                  flex: step === 0 ? 1 : undefined,
                  opacity: (step === 0 && !canProceedStep0) || (step === 1 && !canProceedStep1) ? 0.45 : 1,
                },
              ]}
              onPress={() => {
                if (step === 0) {
                  if (!canProceedStep0) return;
                  setStep(1);
                } else {
                  if (!canProceedStep1) return;
                  onSubmit();
                }
              }}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <Text style={styles.nextBtnText}>Submitting…</Text>
              ) : (
                <>
                  <Text style={styles.nextBtnText}>{step === 1 ? "Submit Claim" : "Continue"}</Text>
                  <Ionicons name={step === 1 ? "ribbon" : "chevron-forward"} size={17} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
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
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  mutedText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  scroll: { padding: 16, gap: 20 },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  chipName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  chipAddr: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  stepDots: { flexDirection: "row", alignItems: "center" },
  stepDotItem: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  stepDotCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotNum: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  stepDotLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  stepDotLine: { height: 2, width: 24, marginHorizontal: 4 },
  formBlock: { gap: 16 },
  formTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  formSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginTop: -8 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 17 },
  benefitsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  benefitsHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  benefitsTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  benefitText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  footer: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  backBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  nextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  nextBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  successWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  successIcon: { width: 90, height: 90, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  successSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  successBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  successBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
