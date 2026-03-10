import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    TextInput,
    View,
} from "react-native";

import { useProfile } from "@/hooks/useProfile";
import { ensureAnonymousSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { Screen } from "@/src/components/ui/Screen";
import { Typography } from "@/src/components/ui/Typography";
import { trackEvent } from "@/src/services/analytics";
import { captureException } from "@/src/services/errorTracking";

export function SetupScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const [selectedDate, setSelectedDate] = useState(14);
  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? "");
    setUsername(profile.username ?? "");
    setDateOfBirth(profile.date_of_birth ?? "");
  }, [profile]);

  const { monthLabel, year, daysInMonth } = useMemo(() => {
    const today = new Date();
    return {
      monthLabel: today.toLocaleDateString(undefined, { month: "long" }),
      year: today.getFullYear(),
      daysInMonth: new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
      ).getDate(),
    };
  }, []);

  const dates = useMemo(
    () => Array.from({ length: daysInMonth }, (_, index) => index + 1),
    [daysInMonth],
  );

  async function handleContinue() {
    if (isLoading) return;
    if (!firstName.trim()) {
      Alert.alert("Missing name", "Please enter your first name.");
      return;
    }

    const normalizedUsername = username
      .trim()
      .replace(/\s+/g, "")
      .toLowerCase();
    const normalizedDob = dateOfBirth.trim();
    if (!normalizedUsername) {
      Alert.alert("Missing username", "Please choose a username.");
      return;
    }
    if (normalizedDob && !/^\d{4}-\d{2}-\d{2}$/.test(normalizedDob)) {
      Alert.alert("Invalid date", "Use YYYY-MM-DD for date of birth.");
      return;
    }

    setIsLoading(true);
    try {
      const user = await ensureAnonymousSession();
      if (!user) throw new Error("Could not establish a session.");

      const today = new Date();
      const startDate = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(selectedDate).padStart(2, "0"),
      ].join("-");

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

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim(),
          username: normalizedUsername,
          date_of_birth: normalizedDob || null,
          is_onboarded: true,
        })
        .eq("id", user.id);
      if (profileError) throw profileError;

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
    <Screen>
      {/* ── Progress dots ───────────────────────────── */}
      <View className="mt-2 flex-row items-center justify-center gap-2">
        <View className="h-2 w-2 rounded-full bg-somaBlush" />
        <View className="h-2 w-2 rounded-full bg-somaBlush/30" />
        <View className="h-2 w-2 rounded-full bg-somaBlush/30" />
      </View>

      {/* ── Heading ─────────────────────────────────── */}
      <View className="mt-8 mb-6">
        <Typography variant="serifMd">
          {"When did your\nlast period start?"}
        </Typography>
        <Typography className="mt-4 text-[15px] text-somaMauve dark:text-darkTextSecondary">
          This helps us provide accurate predictions.
        </Typography>
      </View>

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
            autoCapitalize="none"
            placeholder="yourname"
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
      </View>

      {/* ── Date picker card ─────────────────────────── */}
      <View
        style={{
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
        <Typography
          variant="helper"
          className="mb-4 text-center uppercase tracking-widest"
        >
          {monthLabel} {year}
        </Typography>

        <ScrollView
          style={{ height: 288 }}
          contentContainerStyle={{ alignItems: "center", paddingVertical: 56 }}
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
            Continue
          </Typography>
        )}
      </PressableScale>
    </Screen>
  );
}
