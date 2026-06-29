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
  renderIcon: (loading: boolean) => React.ReactNode;
};

function GoogleIcon() {
  return (
    <View style={googleStyles.container}>
      <Text style={[googleStyles.g, googleStyles.gBlue]}>G</Text>
      <View style={googleStyles.colorBar}>
        <View style={[googleStyles.dot, { backgroundColor: "#4285F4" }]} />
        <View style={[googleStyles.dot, { backgroundColor: "#34A853" }]} />
        <View style={[googleStyles.dot, { backgroundColor: "#FBBC05" }]} />
        <View style={[googleStyles.dot, { backgroundColor: "#EA4335" }]} />
      </View>
    </View>
  );
}

const googleStyles = StyleSheet.create({
  container: { width: 26, height: 26, alignItems: "center", justifyContent: "center" },
  g: { fontSize: 22, fontFamily: "Inter_700Bold", lineHeight: 26 },
  gBlue: { color: "#4285F4" },
  colorBar: { flexDirection: "row", gap: 2, position: "absolute", bottom: 0 },
  dot: { width: 5, height: 2, borderRadius: 1 },
});

const SOCIALS: SocialProvider[] = [
  {
    key: "google",
    strategy: "oauth_google",
    label: "Google",
    renderIcon: (loading) =>
      loading ? <ActivityIndicator size="small" color="#4285F4" /> : <GoogleIcon />,
  },
  {
    key: "apple",
    strategy: "oauth_apple",
    label: "Apple",
    renderIcon: (loading) =>
      loading ? (
        <ActivityIndicator size="small" color="#000" />
      ) : (
        <Ionicons name="logo-apple" size={26} color="#000" />
      ),
  },
  {
    key: "github",
    strategy: "oauth_github",
    label: "GitHub",
    renderIcon: (loading) =>
      loading ? (
        <ActivityIndicator size="small" color="#24292E" />
      ) : (
        <Ionicons name="logo-github" size={26} color="#24292E" />
      ),
  },
  {
    key: "x",
    strategy: "oauth_x",
    label: "X",
    renderIcon: (loading) =>
      loading ? (
        <ActivityIndicator size="small" color="#000" />
      ) : (
        <Ionicons name="logo-x" size={24} color="#000" />
      ),
  },
];

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
                return;
              }
              router.replace(decorateUrl("/") as any);
            },
          });
        }
      } catch {
      } finally {
        setLoading(null);
      }
    },
    [startSSOFlow],
  );

  return (
    <View style={[styles.container, { backgroundColor: "#FFFFFF" }]}>
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
      >
        {/* Hero */}
        <View style={styles.heroWrap}>
          <Image
            source={require("@/assets/images/logo_usa_blue.png")}
            style={styles.heroImg}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Your Ultimate Final-Mile Guide</Text>
        </View>

        {/* Auth card */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={goLogin}
            activeOpacity={0.85}
          >
            <Text style={styles.loginBtnText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signupBtn}
            onPress={goSignUp}
            activeOpacity={0.85}
          >
            <Text style={styles.signupBtnText}>Sign Up</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or connect using</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            {SOCIALS.map((s) => (
              <Pressable
                key={s.key}
                onPress={() => onSocial(s.strategy)}
                disabled={loading !== null}
                style={({ pressed }) => [
                  styles.socialBtn,
                  {
                    opacity: pressed || (loading !== null && loading !== s.strategy) ? 0.5 : 1,
                  },
                ]}
                accessibilityLabel={`Continue with ${s.label}`}
              >
                {s.renderIcon(loading === s.strategy)}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Skip */}
        <TouchableOpacity onPress={() => router.replace("/(tabs)")} hitSlop={12}>
          <Text style={styles.skip}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const PRIMARY = "#3D8DC4";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
    gap: 32,
    alignItems: "stretch",
  },
  heroWrap: { alignItems: "center", gap: 10 },
  heroImg: { width: 300, height: 190 },
  tagline: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    color: "#7A8CA0",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2E8EF",
    padding: 22,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  loginBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  loginBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  signupBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  signupBtnText: {
    color: PRIMARY,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 2,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E2E8EF" },
  dividerText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#7A8CA0",
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
  },
  socialBtn: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8EF",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  skip: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    color: "#7A8CA0",
  },
});
