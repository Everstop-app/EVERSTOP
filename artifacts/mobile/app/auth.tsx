import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth, AccountType } from "@/contexts/AuthContext";

/* ──────────────────────────────── */
/*  Top-level reusable field comps  */
/* ──────────────────────────────── */

const InputField = React.memo(function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "words";
}) {
  const colors = useColors();
  const inputStyle = useMemo(() => [styles.input, { color: colors.foreground }], [colors.foreground]);
  const rowStyle = useMemo(() => [styles.inputRow, { backgroundColor: colors.secondary, borderColor: colors.border }], [colors.secondary, colors.border]);
  const labelStyle = useMemo(() => [styles.inputLabel, { color: colors.mutedForeground }], [colors.mutedForeground]);
  return (
    <View style={styles.inputWrap}>
      <Text style={labelStyle}>{label}</Text>
      <View style={rowStyle}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          style={inputStyle}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? "none"}
          autoCorrect={false}
        />
      </View>
    </View>
  );
});

const PasswordField = React.memo(function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  showPassword,
  setShowPassword,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
}) {
  const colors = useColors();
  const inputStyle = useMemo(() => [styles.input, { color: colors.foreground }], [colors.foreground]);
  const rowStyle = useMemo(() => [styles.inputRow, { backgroundColor: colors.secondary, borderColor: colors.border }], [colors.secondary, colors.border]);
  const labelStyle = useMemo(() => [styles.inputLabel, { color: colors.mutedForeground }], [colors.mutedForeground]);
  return (
    <View style={styles.inputWrap}>
      <Text style={labelStyle}>{label}</Text>
      <View style={rowStyle}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          style={inputStyle}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
          <Ionicons name={showPassword ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

/* ──────────────────────────────── */
/*  Main screen                     */
/* ──────────────────────────────── */

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();
  const params = useLocalSearchParams<{ mode?: string }>();

  const [mode, setMode] = useState<"login" | "register">(
    params.mode === "register" ? "register" : "login",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("driver");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const WEB_TOP = Platform.OS === "web" ? 67 : 0;

  const onSubmit = useCallback(async () => {
    if (!email.trim() || !password.trim()) { setError("Please fill in all fields"); return; }
    if (mode === "register" && !name.trim()) { setError("Please enter your name"); return; }
    setError("");
    setLoading(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      if (mode === "login") {
        const ok = await login(email.trim().toLowerCase(), password);
        if (!ok) { setError("Account not found. Try registering first."); return; }
      } else {
        const ok = await register(name.trim(), email.trim().toLowerCase(), password, accountType);
        if (!ok) { setError("Email already in use."); return; }
      }
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } finally {
      setLoading(false);
    }
  }, [email, password, mode, name, accountType, login, register]);

  const innerPadding = useMemo(() => ({
    paddingTop: insets.top + WEB_TOP + 10,
    paddingBottom: insets.bottom + 16,
  }), [insets.top, insets.bottom]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.inner, innerPadding]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.closeBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
        >
          <Ionicons name="close" size={20} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.logoWrap}>
          <Image
            source={require("@/assets/images/logo_transparent.png")}
            style={styles.logoImg}
            contentFit="contain"
          />
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            The community GPS for truck drivers
          </Text>
        </View>

        {/* Mode switcher */}
        <View style={[styles.modeSwitcher, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          {(["login", "register"] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => { setMode(m); setError(""); }}
              style={[
                styles.modeBtn,
                mode === m && { backgroundColor: colors.primary },
              ]}
            >
              <Text style={[styles.modeBtnText, { color: mode === m ? "#fff" : colors.mutedForeground }]}>
                {m === "login" ? "Sign In" : "Register"}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.form}>
          {mode === "register" && (
            <InputField
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="John Smith"
              autoCapitalize="words"
            />
          )}

          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
          />

          <PasswordField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            showPassword={showPassword}
            setShowPassword={setShowPassword}
          />

          {mode === "register" && (
            <View style={styles.inputWrap}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Account Type</Text>
              <View style={styles.accountTypeRow}>
                {(["driver", "customer"] as const).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setAccountType(type)}
                    style={[
                      styles.typeBtn,
                      {
                        backgroundColor: accountType === type ? colors.primary + "18" : colors.secondary,
                        borderColor: accountType === type ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={(type === "driver" ? "truck" : "business") as any}
                      size={20}
                      color={accountType === type ? colors.primary : colors.mutedForeground}
                    />
                    <Text style={[styles.typeText, { color: accountType === type ? colors.primary : colors.foreground }]}>
                      {type === "driver" ? "Driver" : "Customer"}
                    </Text>
                    <Text style={[styles.typeSub, { color: colors.mutedForeground }]}>
                      {type === "driver" ? "Deliver & navigate" : "Add your location"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: "#EF444418", borderColor: "#EF444444" }]}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={onSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>{mode === "login" ? "Sign In" : "Create Account"}</Text>
            )}
          </TouchableOpacity>

          {mode === "register" && (
            <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
              By creating an account you agree to contribute accurate information to the EverStop community.
            </Text>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24, gap: 20, justifyContent: "center" },
  closeBtn: {
    position: "absolute",
    top: 0,
    right: 24,
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  logoWrap: { alignItems: "center", gap: 8 },
  logoImg: { width: 300, height: 110 },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: { fontSize: 26, fontFamily: "Inter_700Bold" },
  tagline: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  modeSwitcher: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  modeBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  form: { gap: 14 },
  inputWrap: { gap: 6 },
  inputLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  accountTypeRow: { flexDirection: "row", gap: 10 },
  typeBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  typeText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  typeSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: { color: "#EF4444", fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  disclaimer: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 16 },
});
