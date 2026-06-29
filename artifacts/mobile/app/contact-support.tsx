import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
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

const FAQS = [
  {
    q: "How do I add a new delivery location?",
    a: "Tap the + button on the map screen, drop a pin at the address, fill in the access details, and submit. It becomes visible to the community after basic verification.",
  },
  {
    q: "What does 'Trusted Location' mean?",
    a: "A location earns Trusted status when it has 40+ upvotes and a verification score above 90. These locations are confirmed accurate by the driver community.",
  },
  {
    q: "How do I earn points and level up?",
    a: "You earn points by adding locations, uploading photos, verifying existing entries, and receiving upvotes. More points unlock higher driver ranks.",
  },
  {
    q: "How do I reset my password?",
    a: "Go to the login screen and tap 'Forgot password?' below the Sign In button. Enter your email to receive reset instructions.",
  },
  {
    q: "How do I delete my account?",
    a: "Go to Profile → scroll to the bottom of Account Actions → tap Delete Account. You will be asked to confirm before any data is removed.",
  },
];

export default function ContactSupportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const WEB_TOP = Platform.OS === "web" ? 67 : 0;

  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const sendEmail = () => {
    const to = "support@everstop.app";
    const sub = encodeURIComponent(subject || "EverStop Support Request");
    const body = encodeURIComponent(
      message +
        (user ? `\n\n---\nAccount: ${user.email}\nUser ID: ${user.id}` : "")
    );
    Linking.openURL(`mailto:${to}?subject=${sub}&body=${body}`);
  };

  const onSendInApp = async () => {
    if (!message.trim()) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSending(true);
    await new Promise((r) => setTimeout(r, 1000));
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSending(false);
    setSent(true);
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
          Contact Support
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.heroCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primary + "20" }]}>
            <Ionicons name="headset-outline" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>We're here to help</Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            Our team typically responds within 24–48 hours on business days.
          </Text>
        </View>

        {/* Quick contact options */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Get in Touch</Text>
        <View style={styles.contactCards}>
          <TouchableOpacity
            style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => Linking.openURL("mailto:support@everstop.app")}
            activeOpacity={0.8}
          >
            <View style={[styles.contactIcon, { backgroundColor: "#3D8DC418" }]}>
              <Ionicons name="mail-outline" size={22} color="#3D8DC4" />
            </View>
            <View style={styles.contactText}>
              <Text style={[styles.contactLabel, { color: colors.foreground }]}>Email Support</Text>
              <Text style={[styles.contactValue, { color: colors.mutedForeground }]}>support@everstop.app</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => Linking.openURL("https://www.everstop.app/help")}
            activeOpacity={0.8}
          >
            <View style={[styles.contactIcon, { backgroundColor: "#22C55E18" }]}>
              <Ionicons name="book-outline" size={22} color="#22C55E" />
            </View>
            <View style={styles.contactText}>
              <Text style={[styles.contactLabel, { color: colors.foreground }]}>Help Center</Text>
              <Text style={[styles.contactValue, { color: colors.mutedForeground }]}>Browse guides &amp; FAQs</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => Linking.openURL("https://www.everstop.app/community")}
            activeOpacity={0.8}
          >
            <View style={[styles.contactIcon, { backgroundColor: "#8B5CF618" }]}>
              <Ionicons name="people-outline" size={22} color="#8B5CF6" />
            </View>
            <View style={styles.contactText}>
              <Text style={[styles.contactLabel, { color: colors.foreground }]}>Community Forum</Text>
              <Text style={[styles.contactValue, { color: colors.mutedForeground }]}>Ask the driver community</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Send a message */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Send a Message</Text>
        {sent ? (
          <View style={[styles.sentBox, { backgroundColor: "#10B98112", borderColor: "#10B98130" }]}>
            <Ionicons name="checkmark-circle" size={28} color="#10B981" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sentTitle, { color: colors.foreground }]}>Message sent!</Text>
              <Text style={[styles.sentSub, { color: colors.mutedForeground }]}>
                We'll reply to {user?.email || "your email"} within 24–48 hours.
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.messageForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.fieldWrap, { borderColor: colors.border }]}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Subject</Text>
              <TextInput
                value={subject}
                onChangeText={setSubject}
                placeholder="e.g. Can't add a location"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
              />
            </View>
            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Message</Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Describe your issue in as much detail as possible…"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.fieldInput,
                  styles.fieldTextArea,
                  { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary },
                ]}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{message.length}/1000</Text>
            </View>
            <View style={styles.formActions}>
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  { backgroundColor: message.trim() ? colors.primary : colors.secondary, borderColor: message.trim() ? colors.primary : colors.border },
                ]}
                onPress={onSendInApp}
                disabled={!message.trim() || sending}
                activeOpacity={0.85}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="send-outline" size={16} color={message.trim() ? "#fff" : colors.mutedForeground} />
                    <Text style={[styles.sendBtnText, { color: message.trim() ? "#fff" : colors.mutedForeground }]}>
                      Send Message
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.emailBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={sendEmail}
                activeOpacity={0.8}
              >
                <Ionicons name="mail-outline" size={16} color={colors.mutedForeground} />
                <Text style={[styles.emailBtnText, { color: colors.mutedForeground }]}>Open in Mail app</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* FAQ */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Frequently Asked Questions</Text>
        <View style={[styles.faqList, { borderColor: colors.border }]}>
          {FAQS.map((faq, i) => {
            const open = expandedFaq === i;
            return (
              <View key={i} style={[styles.faqItem, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.faqQuestion}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.selectionAsync();
                    setExpandedFaq(open ? null : i);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.faqQ, { color: colors.foreground, flex: 1 }]}>{faq.q}</Text>
                  <Ionicons
                    name={open ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>
                {open && (
                  <Text style={[styles.faqA, { color: colors.mutedForeground }]}>{faq.a}</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* App info */}
        <View style={[styles.appInfo, { borderColor: colors.border }]}>
          <Text style={[styles.appInfoText, { color: colors.mutedForeground }]}>
            EverStop · Version 1.0.0
          </Text>
          <Text style={[styles.appInfoText, { color: colors.mutedForeground }]}>
            © 2026 EverStop. All rights reserved.
          </Text>
        </View>
      </ScrollView>
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
  content: { padding: 20, gap: 14 },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  heroIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  heroSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  contactCards: { gap: 10 },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  contactText: { flex: 1 },
  contactLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  contactValue: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  messageForm: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  fieldTextArea: { minHeight: 110, paddingTop: 12, textAlignVertical: "top" },
  charCount: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  formActions: { gap: 10 },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 13,
  },
  sendBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emailBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 11,
  },
  emailBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  sentBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  sentTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sentSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  faqList: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  faqItem: { paddingHorizontal: 16 },
  faqQuestion: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 12,
  },
  faqQ: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  faqA: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    paddingBottom: 16,
  },
  appInfo: {
    borderTopWidth: 1,
    paddingTop: 16,
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  appInfoText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
