import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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

type ReportCategory = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const CATEGORIES: ReportCategory[] = [
  { id: "inappropriate",  label: "Inappropriate / Offensive Content", icon: "warning-outline",       color: "#EF4444" },
  { id: "photos",         label: "Inappropriate Photos",              icon: "image-outline",          color: "#F59E0B" },
  { id: "spam",           label: "Spam or Fake Information",          icon: "ban-outline",            color: "#8B5CF6" },
  { id: "harassment",     label: "Harassment or Abuse",               icon: "person-remove-outline",  color: "#D22F30" },
  { id: "misinformation", label: "Dangerous Misinformation",          icon: "alert-circle-outline",   color: "#F97316" },
  { id: "other",          label: "Something Else",                    icon: "ellipsis-horizontal-circle-outline", color: "#6B7280" },
];

export default function ReportContentScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    locationId?: string;
    locationName?: string;
    type?: string;
  }>();

  const WEB_TOP = Platform.OS === "web" ? 67 : 0;

  const [selected, setSelected] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const context = params.locationName
    ? `Location: ${params.locationName}`
    : params.type === "photo"
    ? "Photo"
    : params.type === "comment"
    ? "Comment"
    : "General Report";

  const onSubmit = async () => {
    if (!selected) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 900));
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + WEB_TOP + 8,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Report Content
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {submitted ? (
        /* ── Success state ── */
        <View style={styles.successWrap}>
          <View style={[styles.successIcon, { backgroundColor: "#10B98118" }]}>
            <Ionicons name="checkmark-circle" size={52} color="#10B981" />
          </View>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>
            Report Submitted
          </Text>
          <Text style={[styles.successBody, { color: colors.mutedForeground }]}>
            Thank you for helping keep EverStop safe. Our team will review your report and take appropriate action.
          </Text>
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ── Form ── */
        <ScrollView
          contentContainerStyle={[
            styles.form,
            { paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Context pill */}
          {(params.locationName || params.type) && (
            <View style={[styles.contextPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
              <Text style={[styles.contextText, { color: colors.mutedForeground }]}>{context}</Text>
            </View>
          )}

          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
            What's the issue?
          </Text>
          <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
            Select the category that best describes the problem.
          </Text>

          {/* Category list */}
          <View style={styles.categoryList}>
            {CATEGORIES.map((cat) => {
              const isSelected = selected === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.selectionAsync();
                    setSelected(cat.id);
                  }}
                  style={[
                    styles.categoryRow,
                    {
                      backgroundColor: isSelected ? cat.color + "12" : colors.card,
                      borderColor: isSelected ? cat.color : colors.border,
                    },
                  ]}
                >
                  <View style={[styles.catIconWrap, { backgroundColor: cat.color + "18" }]}>
                    <Ionicons name={cat.icon} size={20} color={cat.color} />
                  </View>
                  <Text style={[styles.catLabel, { color: colors.foreground }]}>
                    {cat.label}
                  </Text>
                  <View style={[
                    styles.radio,
                    {
                      borderColor: isSelected ? cat.color : colors.border,
                      backgroundColor: isSelected ? cat.color : "transparent",
                    },
                  ]}>
                    {isSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Additional details */}
          <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 8 }]}>
            Additional Details <Text style={[styles.optional, { color: colors.mutedForeground }]}>(optional)</Text>
          </Text>
          <View
            style={[
              styles.textAreaWrap,
              { backgroundColor: colors.secondary, borderColor: colors.border },
            ]}
          >
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Describe what you saw so our team can investigate effectively…"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.textArea, { color: colors.foreground }]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
              {details.length}/500
            </Text>
          </View>

          {/* Notice */}
          <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
              Reports are reviewed by the EverStop trust &amp; safety team. False reports may affect your account standing.
            </Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              {
                backgroundColor: selected ? "#D22F30" : colors.secondary,
                borderColor: selected ? "#D22F30" : colors.border,
                opacity: loading ? 0.7 : 1,
              },
            ]}
            onPress={onSubmit}
            disabled={!selected || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="flag" size={18} color={selected ? "#fff" : colors.mutedForeground} />
                <Text style={[styles.submitBtnText, { color: selected ? "#fff" : colors.mutedForeground }]}>
                  Submit Report
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: { width: 32, alignItems: "flex-start" },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  form: { padding: 20, gap: 12 },
  contextPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  contextText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  sectionLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  sectionSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -6 },
  optional: { fontSize: 13, fontFamily: "Inter_400Regular" },
  categoryList: { gap: 8 },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  catIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  catLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  textAreaWrap: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  textArea: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 100,
    padding: 0,
  },
  charCount: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  noticeText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 15,
    marginTop: 4,
  },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  successWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  successBody: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 23 },
  doneBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 48,
    marginTop: 8,
  },
  doneBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
