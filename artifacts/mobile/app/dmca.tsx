import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function DmcaScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const WEB_TOP = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          DMCA &amp; Copyright
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.effectiveDate, { color: colors.mutedForeground }]}>
          Effective Date: June 29, 2026
        </Text>

        <Text style={[styles.body, { color: colors.foreground }]}>
          EverStop respects the intellectual property rights of others and
          expects all users of our website and mobile application to do the
          same. We comply with the Digital Millennium Copyright Act (DMCA) and
          will respond promptly to valid copyright infringement claims.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Reporting Copyright Infringement
        </Text>
        <Text style={[styles.body, { color: colors.foreground }]}>
          If you believe that any content available through EverStop infringes
          your copyright, please submit a written DMCA notice containing:
        </Text>

        {[
          "Your full name and contact information.",
          "A description of the copyrighted work you believe has been infringed.",
          "The exact location (URL or other identifying information) of the allegedly infringing material.",
          "A statement that you have a good faith belief that the use of the material is not authorized by the copyright owner, its agent, or the law.",
          "A statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act on behalf of the copyright owner.",
        ].map((item, i) => (
          <View key={i} style={styles.bulletRow}>
            <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
            <Text style={[styles.bulletText, { color: colors.foreground }]}>{item}</Text>
          </View>
        ))}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Copyright Notice
        </Text>
        <Text style={[styles.body, { color: colors.foreground }]}>
          © 2026 EverStop. All rights reserved. EverStop, its logo, app design,
          text, graphics, software, and related content are protected by U.S.
          and international copyright laws. Unauthorized copying, distribution,
          modification, or reproduction is prohibited.
        </Text>
        <Text style={[styles.body, { color: colors.foreground }]}>
          DMCA takedown requests may be submitted for any unauthorized use of
          EverStop&apos;s copyrighted materials.
        </Text>

        <View style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="mail-outline" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.contactLabel, { color: colors.mutedForeground }]}>
              Submit DMCA notices to
            </Text>
            <Text style={[styles.contactValue, { color: colors.primary }]}>
              legal@everstop.app
            </Text>
          </View>
        </View>

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          © 2026 EverStop. All rights reserved.
        </Text>
      </ScrollView>
    </View>
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
  backBtn: {
    width: 32,
    alignItems: "flex-start",
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  content: {
    padding: 20,
    gap: 14,
  },
  effectiveDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginTop: 6,
  },
  body: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  contactLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  footer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    opacity: 0.6,
    marginTop: 8,
  },
});
