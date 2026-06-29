import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const ACCOUNTS_KEY = "everstop_accounts";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const WEB_TOP = Platform.OS === "web" ? 67 : 0;

  const [step, setStep] = useState<"email" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheckEmail = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError("Please enter your email address."); return; }
    setError("");
    setLoading(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const stored = await AsyncStorage.getItem(ACCOUNTS_KEY);
      const accounts = stored ? JSON.parse(stored) : {};
      if (!accounts[trimmed]) {
        setError("No account found with that email address.");
        return;
      }
      setStep("reset");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!newPassword) { setError("Please enter a new password."); return; }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setError("");
    setLoading(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const stored = await AsyncStorage.getItem(ACCOUNTS_KEY);
      const accounts = stored ? JSON.parse(stored) : {};
      const key = email.trim().toLowerCase();
      if (accounts[key]) {
        accounts[key] = { ...accounts[key], _password: newPassword };
        await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
      }
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("done");
    } finally {
      setLoading(false);
    }
  };

  const inputRow = (colors: any) => ({
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 8,
    backgroundColor: colors.secondary,
    borderColor: colors.border,
  });

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
          onPress={() => (step === "reset" ? setStep("email") : router.back())}
          style={styles.backBtn}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Reset Password
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {step === "email" && (
          <>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + "18" }]}>
              <Ionicons name="lock-closed-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Forgot your password?</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Enter the email address on your account. We'll verify it and let you set a new password.
            </Text>

            <View style={styles.fieldWrap}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Email Address</Text>
              <View style={inputRow(colors)}>
                <TextInput
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(""); }}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { color: colors.foreground }]}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
              </View>
            </View>

            {error ? <ErrorBox message={error} /> : null}

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={handleCheckEmail}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnText}>Continue</Text>}
            </TouchableOpacity>
          </>
        )}

        {step === "reset" && (
          <>
            <View style={[styles.iconCircle, { backgroundColor: "#10B98118" }]}>
              <Ionicons name="checkmark-circle-outline" size={32} color="#10B981" />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Set a new password</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Account found for <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{email.trim().toLowerCase()}</Text>. Choose a new password below.
            </Text>

            <View style={styles.fieldWrap}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>New Password</Text>
              <View style={inputRow(colors)}>
                <TextInput
                  value={newPassword}
                  onChangeText={(t) => { setNewPassword(t); setError(""); }}
                  placeholder="At least 8 characters"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { color: colors.foreground }]}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
                <TouchableOpacity onPress={() => setShowNew(!showNew)} hitSlop={8}>
                  <Ionicons name={showNew ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Confirm Password</Text>
              <View style={inputRow(colors)}>
                <TextInput
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setError(""); }}
                  placeholder="Repeat your new password"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { color: colors.foreground }]}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} hitSlop={8}>
                  <Ionicons name={showConfirm ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>

            {error ? <ErrorBox message={error} /> : null}

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={handleReset}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnText}>Save New Password</Text>}
            </TouchableOpacity>
          </>
        )}

        {step === "done" && (
          <>
            <View style={[styles.iconCircle, { backgroundColor: "#10B98118" }]}>
              <Ionicons name="checkmark-circle" size={40} color="#10B981" />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Password updated!</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Your password has been changed. You can now sign in with your new password.
            </Text>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }]}
              onPress={() => router.replace("/auth?mode=login")}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>Back to Sign In</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <View style={[styles.errorBox, { backgroundColor: "#EF444418", borderColor: "#EF444444" }]}>
      <Ionicons name="alert-circle" size={16} color="#EF4444" />
      <Text style={styles.errorText}>{message}</Text>
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
  backBtn: { width: 32, alignItems: "flex-start" },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    gap: 16,
    alignItems: "stretch",
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 4,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  fieldWrap: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", padding: 0 },
  btn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: { color: "#EF4444", fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
});
