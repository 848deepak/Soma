/**
 * src/screens/LoginScreen.tsx
 *
 * Sign-in screen aligned with Figma design system.
 * Route: /auth/login
 */
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  View,
} from "react-native";

import {
  ensureAnonymousSession,
  resetPassword,
  signInWithEmail,
} from "@/lib/auth";
import { BrandOrb } from "@/src/components/ui/BrandOrb";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { Screen } from "@/src/components/ui/Screen";
import { Typography } from "@/src/components/ui/Typography";
import { HAS_LAUNCHED_KEY } from "@/src/constants/storage";
import { useAppTheme } from "@/src/context/ThemeContext";
import { identifyUser } from "@/src/services/analytics";
import { recordRequiredAuthConsent } from "@/src/services/consentService";
import { sanitizeInput, validateEmail } from "@/src/utils/validation";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function LoginScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [resetSent, setResetSent] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(true);

  // Required flow: Sign in/up → Welcome → Home
  async function routeAfterLogin(_userId: string) {
    router.replace("/welcome" as never);
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
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
      const user = await signInWithEmail(
        sanitizeInput(email).toLowerCase(),
        password,
      );
      await recordRequiredAuthConsent();
      await AsyncStorage.setItem(HAS_LAUNCHED_KEY, "true");
      if (user) {
        identifyUser(user.id, { auth_method: "email" });
        await routeAfterLogin(user.id);
      } else {
        router.replace("/(tabs)" as never);
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Sign in failed. Please try again.";
      Alert.alert("Sign In Failed", message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!email.trim()) {
      Alert.alert(
        "Email required",
        "Enter your email address to receive a reset link.",
      );
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    setIsLoading(true);
    try {
      await resetPassword(sanitizeInput(email).toLowerCase());
      setResetSent(true);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to send reset email.";
      Alert.alert("Error", message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleContinueAnonymously() {
    try {
      await ensureAnonymousSession();
      await AsyncStorage.setItem(HAS_LAUNCHED_KEY, "true");
      // Route through onboarding so anonymous users set their cycle data
      router.replace("/welcome" as never);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not continue without an account.";
      if (message.toLowerCase().includes("anonymous access is disabled")) {
        Alert.alert("Account required", message, [
          {
            text: "Create Account",
            onPress: () => router.push("/auth/signup" as never),
          },
          { text: "Cancel", style: "cancel" },
        ]);
        return;
      }
      Alert.alert("Sign In Failed", message);
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={24}
    >
      <Screen>
        <View
          style={{ justifyContent: "center", minHeight: 620, paddingTop: 18 }}
        >
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
            {mode === "login" ? "Welcome back" : "Reset password"}
          </Typography>
          <Typography variant="muted" className="mb-10 text-center">
            {mode === "login"
              ? "Sign in to continue your wellness journey."
              : "Enter your email and we'll send a recovery link."}
          </Typography>

          {/* ── Email input ──────────────────────────────────── */}
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
              style={{
                fontSize: 16,
                color: isDark ? "#F2F2F2" : "#2D2327",
              }}
              testID="email-input"
            />
          </View>

          {/* ── Password input (login mode only) ─────────────── */}
          {mode === "login" && (
            <View style={{ ...inputContainerStyle, marginBottom: 24 }}>
              <Typography variant="helper" className="mb-1">
                Password
              </Typography>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor="#9B7E8C"
                style={{
                  fontSize: 16,
                  color: isDark ? "#F2F2F2" : "#2D2327",
                }}
                testID="password-input"
              />
            </View>
          )}

          {/* ── Reset confirmation ───────────────────────────── */}
          {resetSent && (
            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(221,167,165,0.3)",
                backgroundColor: "rgba(221,167,165,0.1)",
                paddingHorizontal: 16,
                paddingVertical: 12,
                marginBottom: 16,
              }}
            >
              <Typography className="text-center text-sm text-somaBlush">
                Recovery email sent! Check your inbox.
              </Typography>
            </View>
          )}

          {/* ── Primary CTA ─────────────────────────────────── */}
          <PressableScale
            onPress={mode === "login" ? handleLogin : handleResetPassword}
            className="mb-4 items-center rounded-full bg-somaBlush py-[18px] dark:bg-darkPrimary"
            style={{
              opacity: isLoading ? 0.6 : 1,
              shadowColor: "#DDA7A5",
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.4,
              shadowRadius: 40,
              elevation: 12,
            }}
            testID="primary-button"
          >
            <Typography className="text-base font-semibold text-white">
              {isLoading
                ? mode === "login"
                  ? "Signing in…"
                  : "Sending…"
                : mode === "login"
                  ? "Sign In"
                  : "Send Reset Link"}
            </Typography>
          </PressableScale>

          <PressableScale
            onPress={() => setAcceptedLegal((prev) => !prev)}
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                marginTop: 2,
                borderRadius: 5,
                borderWidth: 1.5,
                borderColor: isDark ? "#A78BFA" : "#DDA7A5",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: acceptedLegal
                  ? isDark
                    ? "#A78BFA"
                    : "#DDA7A5"
                  : "transparent",
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

          {/* ── Secondary links ──────────────────────────────── */}
          <View className="flex-row items-center justify-center gap-4">
            {mode === "login" ? (
              <>
                <PressableScale
                  onPress={() => setMode("reset")}
                  testID="forgot-password-button"
                >
                  <Typography variant="helper">Forgot password?</Typography>
                </PressableScale>
                <Typography variant="helper" className="text-somaMauve">
                  ·
                </Typography>
                <PressableScale
                  onPress={() => router.push("/auth/signup" as never)}
                  testID="create-account-button"
                >
                  <Typography
                    variant="helper"
                    className="text-somaBlush dark:text-darkPrimary"
                  >
                    Create account
                  </Typography>
                </PressableScale>
              </>
            ) : (
              <PressableScale
                onPress={() => {
                  setMode("login");
                  setResetSent(false);
                }}
              >
                <Typography variant="helper">← Back to sign in</Typography>
              </PressableScale>
            )}
          </View>

          {/* ── Continue without account ────────────────────── */}
          <PressableScale
            onPress={handleContinueAnonymously}
            className="mt-8 items-center"
            testID="skip-button"
          >
            <Typography
              variant="helper"
              className="text-somaMauve/60 dark:text-darkTextSecondary/60"
            >
              Continue without an account
            </Typography>
          </PressableScale>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
