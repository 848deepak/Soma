import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { PROFILE_QUERY_KEY, useProfile } from "@/src/domain/auth";
import { ensureAnonymousSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { Screen } from "@/src/components/ui/Screen";
import { Typography } from "@/src/components/ui/Typography";
import { trackEvent } from "@/src/services/analytics";
import { captureException } from "@/src/services/errorTracking";
import { ensureNotificationPreferencesRow } from "@/src/services/notificationPreferencesService";
import { requestParentalConsent } from "@/src/services/parentalConsentService";
import {
  sanitizeInput,
  validateEmail,
  validateIsoDate,
  validateMinimumAge,
} from "@/src/utils/validation";
import { ScreenErrorBoundary } from "@/src/components/ScreenErrorBoundary";

function localTodayIso(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

export function SetupScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const [selectedDate, setSelectedDate] = useState(() => new Date().getDate());
  const [step, setStep] = useState<1 | 2>(1);
  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isUsernameLocked = Boolean(profile?.username?.trim());

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? "");
    setUsername(profile.username ?? "");
    setDateOfBirth(profile.date_of_birth ?? "");
  }, [profile]);

  const { monthLabel, year, dayOfMonth } = useMemo(() => {
    const today = new Date();
    return {
      monthLabel: today.toLocaleDateString(undefined, { month: "long" }),
      year: today.getFullYear(),
      dayOfMonth: today.getDate(),
    };
  }, []);

  const dates = useMemo(
    () => Array.from({ length: dayOfMonth }, (_, index) => index + 1),
    [dayOfMonth],
  );

  function validateDetailsStep(): {
    normalizedFirstName: string;
    normalizedUsername: string;
    normalizedDob: string;
    normalizedParentEmail: string;
    requiresParentalConsent: boolean;
  } | null {
    const normalizedFirstName = sanitizeInput(firstName);
    if (!normalizedFirstName) {
      Alert.alert("Missing name", "Please enter your first name.");
      return null;
    }

    const normalizedUsername = isUsernameLocked
      ? sanitizeInput(profile?.username ?? "")
      : sanitizeInput(username).replace(/\s+/g, "").toLowerCase();
    if (!normalizedUsername) {
      Alert.alert("Missing username", "Please choose a username.");
      return null;
    }

    const normalizedDob = sanitizeInput(dateOfBirth);
    if (normalizedDob && !validateIsoDate(normalizedDob)) {
      Alert.alert("Invalid date", "Use YYYY-MM-DD for date of birth.");
      return null;
    }

    const requiresParentalConsent = Boolean(
      normalizedDob && !validateMinimumAge(normalizedDob, 13),
    );
    const normalizedParentEmail = sanitizeInput(parentEmail).toLowerCase();

    if (requiresParentalConsent && !validateEmail(normalizedParentEmail)) {
      Alert.alert(
        "Parent email required",
        "Enter a valid parent or guardian email to request consent.",
      );
      return null;
    }

    return {
      normalizedFirstName,
      normalizedUsername,
      normalizedDob,
      normalizedParentEmail,
      requiresParentalConsent,
    };
  }

  async function handleContinue() {
    if (isLoading) return;

    const validated = validateDetailsStep();
    if (!validated) {
      return;
    }

    const {
      normalizedFirstName,
      normalizedUsername,
      normalizedDob,
      normalizedParentEmail,
      requiresParentalConsent,
    } = validated;

    if (step === 1) {
      setStep(2);
      return;
    }


    setIsLoading(true);
    try {
      const user = await ensureAnonymousSession();
      if (!user) throw new Error("Could not establish a session.");

      if (requiresParentalConsent) {
        const consentRequest = await requestParentalConsent(
          user.id,
          normalizedParentEmail,
          normalizedDob,
        );
        const { data: consentProfile, error: consentProfileError } = await supabase
          .from("profiles")
          .upsert({
            id: user.id,
            date_of_birth: normalizedDob,
            is_onboarded: false,
          }, { onConflict: "id" })
          .select("*")
          .single();

        if (consentProfileError) throw consentProfileError;
        if (consentProfile) {
          queryClient.setQueryData(PROFILE_QUERY_KEY(user.id), consentProfile);
        }

        if (consentRequest.emailSent) {
          Alert.alert(
            "Parental consent requested",
            "We sent a verification request to your parent/guardian email. Complete verification to continue.",
          );
        } else {
          Alert.alert(
            "Parental consent pending",
            "Your request was saved, but email delivery is not configured yet. Please contact support to complete guardian verification.",
          );
        }
        return;
      }

      const today = new Date();
      const startDate = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(selectedDate).padStart(2, "0"),
      ].join("-");

      if (startDate > localTodayIso()) {
        Alert.alert(
          "Invalid start date",
          "Period start date cannot be in the future.",
        );
        return;
      }

      const { data: existingCycle, error: cycleFetchError } = await supabase
        .from("cycles")
        .select("id")
        .eq("user_id", user.id)
        .is("end_date", null)
        .maybeSingle();

      if (cycleFetchError) throw cycleFetchError;

      if (!existingCycle) {
        const { error: cycleError } = await supabase.from("cycles").insert({
          user_id: user.id,
          start_date: startDate,
          current_phase: "menstrual",
        });
        if (cycleError) throw cycleError;
      }

      const { data: updatedProfile, error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          first_name: normalizedFirstName,
          username: normalizedUsername,
          date_of_birth: normalizedDob || null,
          is_onboarded: true,
        }, { onConflict: "id" })
        .select("*")
        .single();
      if (profileError) throw profileError;
      if (updatedProfile) {
        queryClient.setQueryData(PROFILE_QUERY_KEY(user.id), updatedProfile);
        await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY(user.id) });
      }

      await ensureNotificationPreferencesRow(user.id, false);

      trackEvent("onboarding_complete");

      router.replace("/(tabs)" as never);
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
      );
      Alert.alert(
        "Setup Failed",
        "We could not save your cycle start date. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={24}
    >
      <Screen scrollable={false}>
        <View style={{ flex: 1 }}>
        {/* ── Progress dots ───────────────────────────── */}
        <View className="mt-2 flex-row items-center justify-center gap-2">
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            backgroundColor: step === 1 ? "#DDA7A5" : "rgba(221,167,165,0.3)",
          }}
        />
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            backgroundColor: step === 2 ? "#DDA7A5" : "rgba(221,167,165,0.3)",
          }}
        />
      </View>

      {/* ── Heading ─────────────────────────────────── */}
      <View className="mt-8 mb-6">
        {step === 1 ? (
          <Typography variant="serifMd">{"Welcome to Soma"}</Typography>
        ) : (
          <Typography variant="serifMd">
            {"When did your\nlast period start?"}
          </Typography>
        )}
        <Typography className="mt-4 text-[15px] text-somaMauve dark:text-darkTextSecondary">
          {step === 1
            ? "Provide your details so we can personalize your experience."
            : "This helps us provide accurate predictions."}
        </Typography>
      </View>

      {step === 1 ? (
      <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      <View className="mb-5">
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(221,167,165,0.25)",
            backgroundColor: "rgba(255,255,255,0.85)",
            paddingHorizontal: 16,
            paddingVertical: 12,
            marginBottom: 10,
          }}
        >
          <Typography variant="helper" className="mb-1">
            First name
          </Typography>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Your name"
            placeholderTextColor="#9B7E8C"
            style={{ fontSize: 16, color: "#2D2327" }}
          />
        </View>

        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(221,167,165,0.25)",
            backgroundColor: "rgba(255,255,255,0.85)",
            paddingHorizontal: 16,
            paddingVertical: 12,
            marginBottom: 10,
          }}
        >
          <Typography variant="helper" className="mb-1">
            Username
          </Typography>
          <TextInput
            value={username}
            onChangeText={setUsername}
            editable={!isUsernameLocked}
            autoCapitalize="none"
            placeholder="yourname"
            placeholderTextColor="#9B7E8C"
            style={{ fontSize: 16, color: "#2D2327" }}
          />
          {isUsernameLocked ? (
            <Typography variant="helper" style={{ marginTop: 6 }}>
              Username is locked after account creation.
            </Typography>
          ) : null}
        </View>

        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(221,167,165,0.25)",
            backgroundColor: "rgba(255,255,255,0.85)",
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <Typography variant="helper" className="mb-1">
            Date of birth (YYYY-MM-DD)
          </Typography>
          <TextInput
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder="1995-08-21"
            placeholderTextColor="#9B7E8C"
            style={{ fontSize: 16, color: "#2D2327" }}
          />
        </View>

        {dateOfBirth && !validateMinimumAge(sanitizeInput(dateOfBirth), 13) ? (
          <View
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "rgba(221,167,165,0.25)",
              backgroundColor: "rgba(255,255,255,0.85)",
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginTop: 10,
            }}
          >
            <Typography variant="helper" className="mb-1">
              Parent/guardian email (required under 13)
            </Typography>
            <TextInput
              value={parentEmail}
              onChangeText={setParentEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="parent@example.com"
              placeholderTextColor="#9B7E8C"
              style={{ fontSize: 16, color: "#2D2327" }}
            />
          </View>
        ) : null}
      </View>

      </ScrollView>
      </>
      ) : (
      <View
        style={{
          flex: 1,
          borderRadius: 28,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.6)",
          backgroundColor: "rgba(255,218,185,0.18)",
          padding: 20,
          shadowColor: "#DDA7A5",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 32,
          elevation: 6,
        }}
      >
        {/* ── Date picker card ─────────────────────────── */}
        <Typography
          variant="helper"
          className="mb-4 text-center uppercase tracking-widest"
        >
          {monthLabel} {year}
        </Typography>

        <ScrollView
          style={{ height: 220 }}
          contentContainerStyle={{ alignItems: "center", paddingVertical: 44 }}
          showsVerticalScrollIndicator={false}
        >
          {dates.map((date) => {
            const distance = Math.abs(date - selectedDate);
            const isSelected = date === selectedDate;
            const opacity = Math.max(0.3, 1 - distance * 0.2);

            return (
              <PressableScale
                key={date}
                onPress={() => setSelectedDate(date)}
                className="items-center py-2"
                style={{ opacity }}
              >
                <Typography
                  className={
                    isSelected
                      ? "font-[PlayfairDisplay-SemiBold] text-[48px] font-semibold text-somaCharcoal dark:text-darkTextPrimary"
                      : "text-3xl text-somaMauve dark:text-darkTextSecondary"
                  }
                >
                  {String(date)}
                </Typography>
              </PressableScale>
            );
          })}
        </ScrollView>
      </View>
      )}

        {/* ── Continue CTA ────────────────────────────── */}
        <PressableScale
          onPress={handleContinue}
          className="mt-8 items-center rounded-full bg-somaBlush py-[18px] dark:bg-darkPrimary"
          style={{
            opacity: isLoading ? 0.6 : 1,
            shadowColor: "#DDA7A5",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.4,
            shadowRadius: 40,
            elevation: 12,
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Typography className="text-base font-semibold text-white">
              {step === 1 ? "Continue" : "Done"}
            </Typography>
          )}
        </PressableScale>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

export function SetupScreenWithErrorBoundary() {
  return (
    <ScreenErrorBoundary screenName="SetupScreen">
      <SetupScreen />
    </ScreenErrorBoundary>
  );
}
