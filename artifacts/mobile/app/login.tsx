import { Ionicons } from "@expo/vector-icons";
import { useAuth as useClerkAuth, useSSO } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type ClerkOAuthStrategy =
  | "oauth_google"
  | "oauth_apple"
  | "oauth_github"
  | "oauth_x";

type SocialProvider = {
  key: string;
  strategy: ClerkOAuthStrategy;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const SOCIALS: SocialProvider[] = [
  { key: "google", strategy: "oauth_google", label: "Google", icon: "logo-google", color: "#DB4437" },
  { key: "apple", strategy: "oauth_apple", label: "Apple", icon: "logo-apple", color: "#000000" },
  { key: "github", strategy: "oauth_github", label: "GitHub", icon: "logo-github", color: "#333333" },
  { key: "x", strategy: "oauth_x", label: "X", icon: "logo-x", color: "#000000" },
];

// Preloads the browser for Android devices to reduce auth load time
function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useClerkAuth();
  const { startSSOFlow } = useSSO();
  const [loading, setLoading] = React.useState<string | null>(null);

  useWarmUpBrowser();

  // If already signed in, move to the app
  useEffect(() => {
    if (isSignedIn) router.replace("/(tabs)");
  }, [isSignedIn]);

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

  const onSocial = useCallback(
    async (strategy: ClerkOAuthStrategy) => {
      tap();
      setLoading(strategy);
      try {
        const { createdSessionId, setActive, signIn, signUp } = await startSSOFlow({
          strategy,
          redirectUrl: AuthSession.makeRedirectUri(),
        });

        if (createdSessionId) {
          setActive!({
            session: createdSessionId,
            navigate: async ({ session, decorateUrl }) => {
              if (session?.currentTask) {
                console.log(session?.currentTask);
                return;
              }
              router.replace(decorateUrl("/") as any);
            },
          });
        } else {
          // If there is no createdSessionId, there are missing requirements
          // such as MFA or additional fields
          console.log("SSO missing requirements", { signIn, signUp });
        }
      } catch (err) {
        console.error("SSO error", err);
      } finally {
        setLoading(null);
      }
    },
    [startSSOFlow],
  );

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
            source={require("@/assets/images/logo_usa_blue.png")}
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
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={goLogin}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryBtn,
              { backgroundColor: colors.background, borderColor: colors.primary },
            ]}
            onPress={goSignUp}
            activeOpacity={0.85}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Sign Up</Text>
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
                onPress={() => onSocial(s.strategy)}
                disabled={loading !== null}
                style={({ pressed }) => [
                  styles.socialBtn,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    opacity: pressed || loading !== null ? 0.6 : 1,
                  },
                ]}
                accessibilityLabel={`Continue with ${s.label}`}
              >
                {loading === s.strategy ? (
                  <ActivityIndicator size="small" color={s.color} />
                ) : (
                  <Ionicons name={s.icon} size={24} color={s.color} />
                )}
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
