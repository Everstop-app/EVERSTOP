import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

type SocialProvider = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const SOCIALS: SocialProvider[] = [
  { key: "facebook", label: "Facebook", icon: "logo-facebook", color: "#1877F2" },
  { key: "google", label: "Google", icon: "logo-google", color: "#DB4437" },
  { key: "apple", label: "Apple", icon: "logo-apple", color: "#000000" },
  { key: "linkedin", label: "LinkedIn", icon: "logo-linkedin", color: "#0A66C2" },
  { key: "other", label: "More", icon: "ellipsis-horizontal", color: "#7A8CA0" },
];

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // If the user becomes authenticated (existing session or after the
  // auth modal completes), move them into the app.
  useEffect(() => {
    if (user) router.replace("/(tabs)");
  }, [user]);

  const tap = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const goLogin = () => {
    tap();
    router.push("/auth?mode=login");
  };

  const goSignUp = () => {
    tap();
    router.push("/auth?mode=register");
  };

  const onSocial = () => {
    tap();
    // Social sign-in is not wired to a provider in this prototype.
    router.push("/auth?mode=login");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image
            source={require("@/assets/images/logo_usa_red.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Your Ultimate Final-Mile Guide
          </Text>
        </View>

        {/* Auth box */}
        <View
          style={[
            styles.box,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
            onPress={goLogin}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryBtn,
              { backgroundColor: colors.background, borderColor: colors.accent },
            ]}
            onPress={goSignUp}
            activeOpacity={0.85}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.accent }]}>Sign Up</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>
              or connect using
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Social row */}
          <View style={styles.socialRow}>
            {SOCIALS.map((s) => (
              <Pressable
                key={s.key}
                onPress={onSocial}
                style={({ pressed }) => [
                  styles.socialBtn,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
                accessibilityLabel={`Continue with ${s.label}`}
              >
                <Ionicons name={s.icon} size={24} color={s.color} />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Skip */}
        <TouchableOpacity onPress={() => router.replace("/(tabs)")} hitSlop={10}>
          <Text style={[styles.skip, { color: colors.mutedForeground }]}>
            Skip for now
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
    gap: 36,
  },
  logoWrap: { alignItems: "center", gap: 10 },
  logo: { width: 280, height: 178 },
  tagline: { fontSize: 15, fontFamily: "Inter_500Medium", textAlign: "center" },
  box: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    gap: 14,
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  secondaryBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 2,
  },
  socialBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  skip: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
});
