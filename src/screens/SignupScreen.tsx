/**
 * src/screens/SignupScreen.tsx
 *
 * Account creation screen aligned with Figma design system.
 * Route: /auth/signup
 */
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, TextInput, View } from "react-native";

import { signUpWithEmail } from "@/lib/auth";
import { BrandOrb } from "@/src/components/ui/BrandOrb";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { Screen } from "@/src/components/ui/Screen";
import { Typography } from "@/src/components/ui/Typography";
import { ScreenErrorBoundary } from "@/src/components/ScreenErrorBoundary";
import { HAS_LAUNCHED_KEY } from "@/src/constants/storage";
import { useAppTheme } from "@/src/context/ThemeContext";
import {
    requestAnalyticsConsent,
    revokeAnalyticsConsent,
} from "@/src/services/analytics";
import {
    recordRequiredAuthConsent,
    setAnalyticsConsent,
} from "@/src/services/consentService";
import { ensureNotificationPreferencesRow } from "@/src/services/notificationPreferencesService";
import {
    sanitizeInput,
    validateEmail,
    validatePassword,
} from "@/src/utils/validation";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function SignupScreen() {
  const router = useRouter();
  const { theme, isDark, colors } = useAppTheme();

  const nonDarkSurface =
    theme === "lavender" ? "rgba(232,224,248,0.72)" : "rgba(255,255,255,0.85)";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(true);
  const [analyticsOptIn, setAnalyticsOptIn] = useState(false);
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
      Alert.alert(
        "Weak password",
        "Password must be at least 10 characters and include both letters and numbers.",
      );
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }
    if (!acceptedLegal) {
      Alert.alert(
        "Consent required",
        "Please agree to the Privacy Policy and Terms to continue.",
      );
      return;
    }

    setIsLoading(true);
    try {
      const normalizedEmail = sanitizeInput(email).toLowerCase();
      const signedUpUser = await signUpWithEmail(normalizedEmail, password);
      await recordRequiredAuthConsent();
      await setAnalyticsConsent(analyticsOptIn);
      try {
        await ensureNotificationPreferencesRow(signedUpUser.id, false);
      } catch {
        // If email verification mode blocks RLS writes, settings hook seeds later.
      }
      if (analyticsOptIn) {
        await requestAnalyticsConsent();
      } else {
        await revokeAnalyticsConsent();
      }
      await AsyncStorage.setItem(HAS_LAUNCHED_KEY, "true");
      setSuccessMessage(
        "Verification email sent. Please verify your email, then sign in.",
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
    borderColor: colors.border,
    backgroundColor: isDark ? "rgba(30,33,40,0.9)" : nonDarkSurface,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 12,
    shadowColor: colors.primary,
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
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 32,
              shadowColor: colors.primaryDark,
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
            onPress={() => router.push("/auth/login" as never)}
            className="items-center rounded-full bg-somaBlush px-10 py-[18px] dark:bg-darkPrimary"
            style={{
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.4,
              shadowRadius: 40,
              elevation: 12,
            }}
          >
            <Typography className="text-base font-semibold text-white">
              Go to Sign In
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
            color: colors.textSecondary,
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
            placeholderTextColor={colors.textSecondary}
            style={{ fontSize: 16, color: colors.textPrimary }}
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
            placeholderTextColor={colors.textSecondary}
            style={{ fontSize: 16, color: colors.textPrimary }}
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
            placeholderTextColor={colors.textSecondary}
            style={{ fontSize: 16, color: colors.textPrimary }}
            testID="confirm-password-input"
          />
        </View>

        <View style={{ marginBottom: 18 }}>
          <PressableScale
            onPress={() => setAcceptedLegal((prev) => !prev)}
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                marginTop: 2,
                borderRadius: 5,
                borderWidth: 1.5,
                borderColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: acceptedLegal ? colors.primary : "transparent",
              }}
            >
              {acceptedLegal ? (
                <Typography style={{ color: "#FFFFFF", fontSize: 12 }}>
                  ✓
                </Typography>
              ) : null}
            </View>

            <View style={{ flex: 1 }}>
              <Typography variant="helper" style={{ lineHeight: 18 }}>
                By continuing, you agree to our
              </Typography>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                <PressableScale
                  onPress={() => router.push("/legal/privacy" as never)}
                >
                  <Typography
                    variant="helper"
                    className="text-somaBlush dark:text-darkPrimary"
                  >
                    Privacy Policy
                  </Typography>
                </PressableScale>
                <Typography variant="helper">and</Typography>
                <PressableScale
                  onPress={() => router.push("/legal/terms" as never)}
                >
                  <Typography
                    variant="helper"
                    className="text-somaBlush dark:text-darkPrimary"
                  >
                    Terms of Use
                  </Typography>
                </PressableScale>
                <Typography variant="helper">.</Typography>
              </View>
            </View>
          </PressableScale>

          <PressableScale
            onPress={() => setAnalyticsOptIn((prev) => !prev)}
            style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                marginTop: 2,
                borderRadius: 5,
                borderWidth: 1.5,
                borderColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: analyticsOptIn ? colors.primary : "transparent",
              }}
            >
              {analyticsOptIn ? (
                <Typography style={{ color: "#FFFFFF", fontSize: 12 }}>
                  ✓
                </Typography>
              ) : null}
            </View>
            <Typography variant="helper" style={{ flex: 1, lineHeight: 18 }}>
              I agree to optional analytics to improve Soma reliability.
            </Typography>
          </PressableScale>
        </View>

        {/* ── Create Account CTA ──────────────────────────── */}
        <PressableScale
          onPress={handleSignUp}
          className="mb-4 items-center rounded-full bg-somaBlush py-[18px] dark:bg-darkPrimary"
          style={{
            opacity: isLoading ? 0.6 : 1,
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
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

export function SignupScreenWithErrorBoundary() {
  return (
    <ScreenErrorBoundary screenName="SignupScreen">
      <SignupScreen />
    </ScreenErrorBoundary>
  );
}
