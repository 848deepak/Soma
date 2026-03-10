/**
 * src/screens/SignupScreen.tsx
 *
 * Account creation screen aligned with Figma design system.
 * Route: /auth/signup
 */
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, TextInput, useColorScheme, View } from "react-native";

import { ensureAnonymousSession, signUpWithEmail } from "@/lib/auth";
import { BrandOrb } from "@/src/components/ui/BrandOrb";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { Screen } from "@/src/components/ui/Screen";
import { Typography } from "@/src/components/ui/Typography";
import { HAS_LAUNCHED_KEY } from "@/src/constants/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validatePassword(password: string): boolean {
  return password.length >= 6;
}

export function SignupScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSignUp() {
    if (!email.trim()) {
      Alert.alert("Missing email", "Please enter your email address.");
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    if (!validatePassword(password)) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await ensureAnonymousSession();
      await signUpWithEmail(email.trim(), password);
      await AsyncStorage.setItem(HAS_LAUNCHED_KEY, "true");
      setSuccessMessage(
        "Account created! Check your inbox to verify your email.",
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Sign up failed. Please try again.";
      Alert.alert("Sign Up Failed", message);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Input container style ────────────────────────────────────────────
  const inputContainerStyle = {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(221,167,165,0.25)",
    backgroundColor: isDark ? "rgba(30,33,40,0.9)" : "rgba(255,255,255,0.85)",
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 12,
    shadowColor: "#DDA7A5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  };

  if (successMessage) {
    return (
      <Screen scrollable={false}>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          {/* Success orb */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: isDark ? "#A78BFA" : "#DDA7A5",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 32,
              shadowColor: isDark ? "#7C6BE8" : "#DDA7A5",
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.4,
              shadowRadius: 24,
              elevation: 12,
            }}
          >
            <Typography style={{ fontSize: 32, color: "#FFFFFF" }}>
              ✓
            </Typography>
          </View>
          <Typography variant="serifMd" className="mb-4 text-center">
            Check your email
          </Typography>
          <Typography variant="muted" className="mb-10 text-center">
            {successMessage}
          </Typography>
          <PressableScale
            onPress={() => router.replace("/welcome" as never)}
            className="items-center rounded-full bg-somaBlush px-10 py-[18px] dark:bg-darkPrimary"
            style={{
              shadowColor: "#DDA7A5",
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.4,
              shadowRadius: 40,
              elevation: 12,
            }}
          >
            <Typography className="text-base font-semibold text-white">
              Continue to App
            </Typography>
          </PressableScale>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable={false}>
      <View style={{ flex: 1, justifyContent: "center" }}>
        {/* ── Brand orb ────────────────────────────────────── */}
        <BrandOrb isDark={isDark} />

        {/* ── App name ─────────────────────────────────────── */}
        <Typography
          style={{
            fontFamily: "PlayfairDisplay-SemiBold",
            fontSize: 14,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: isDark ? "rgba(242,242,242,0.5)" : "#9B7E8C",
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          SOMA
        </Typography>

        {/* ── Header ──────────────────────────────────────── */}
        <Typography variant="serifMd" className="mb-2 text-center">
          Create account
        </Typography>
        <Typography variant="muted" className="mb-10 text-center">
          Begin your wellness journey with Soma.
        </Typography>

        {/* ── Email ───────────────────────────────────────── */}
        <View style={inputContainerStyle}>
          <Typography variant="helper" className="mb-1">
            Email
          </Typography>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor="#9B7E8C"
            style={{ fontSize: 16, color: isDark ? "#F2F2F2" : "#2D2327" }}
            testID="email-input"
          />
        </View>

        {/* ── Password ────────────────────────────────────── */}
        <View style={inputContainerStyle}>
          <Typography variant="helper" className="mb-1">
            Password
          </Typography>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="At least 6 characters"
            placeholderTextColor="#9B7E8C"
            style={{ fontSize: 16, color: isDark ? "#F2F2F2" : "#2D2327" }}
            testID="password-input"
          />
        </View>

        {/* ── Confirm Password ─────────────────────────────── */}
        <View style={{ ...inputContainerStyle, marginBottom: 24 }}>
          <Typography variant="helper" className="mb-1">
            Confirm Password
          </Typography>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Repeat your password"
            placeholderTextColor="#9B7E8C"
            style={{ fontSize: 16, color: isDark ? "#F2F2F2" : "#2D2327" }}
            testID="confirm-password-input"
          />
        </View>

        {/* ── Create Account CTA ──────────────────────────── */}
        <PressableScale
          onPress={handleSignUp}
          className="mb-4 items-center rounded-full bg-somaBlush py-[18px] dark:bg-darkPrimary"
          style={{
            opacity: isLoading ? 0.6 : 1,
            shadowColor: "#DDA7A5",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.4,
            shadowRadius: 40,
            elevation: 12,
          }}
          testID="signup-button"
        >
          <Typography className="text-base font-semibold text-white">
            {isLoading ? "Creating account…" : "Create Account"}
          </Typography>
        </PressableScale>

        {/* ── Sign in link ─────────────────────────────────── */}
        <PressableScale
          onPress={() => router.push("/auth/login" as never)}
          className="items-center"
          testID="signin-link"
        >
          <Typography variant="helper">
            Already have an account?{" "}
            <Typography
              variant="helper"
              className="text-somaBlush dark:text-darkPrimary"
            >
              Sign in
            </Typography>
          </Typography>
        </PressableScale>
      </View>
    </Screen>
  );
}
