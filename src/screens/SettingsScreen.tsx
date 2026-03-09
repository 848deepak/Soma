/**
 * SettingsScreen — real profile data, functional logout, notification toggle.
 */
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Appearance, Switch, View, useColorScheme } from "react-native";

import { useProfile } from "@/hooks/useProfile";
import { signOut } from "@/lib/auth";
import { HeaderBar } from "@/src/components/ui/HeaderBar";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { Screen } from "@/src/components/ui/Screen";
import { Typography } from "@/src/components/ui/Typography";
import {
    cancelAllNotifications,
    requestPermissions,
    scheduleDailyLogReminder,
} from "@/src/services/notificationService";

function SectionLabel({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <Typography
      style={{
        marginBottom: 12,
        fontSize: 11,
        fontWeight: "600",
        letterSpacing: 2,
        textTransform: "uppercase",
        color: isDark ? "rgba(242,242,242,0.5)" : "#9B7E8C",
      }}
    >
      {label}
    </Typography>
  );
}

function SettingsRow({
  title,
  tone = "normal",
  isDark,
  onPress,
}: {
  title: string;
  tone?: "normal" | "danger";
  isDark: boolean;
  onPress?: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      style={{
        marginBottom: 8,
        borderRadius: 16,
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,218,185,0.2)",
        paddingHorizontal: 16,
        paddingVertical: 16,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Typography
          style={{
            fontSize: 15,
            color: tone === "danger"
              ? "#EF4444"
              : isDark ? "#F2F2F2" : "#2D2327",
          }}
        >
          {title}
        </Typography>
        <Typography
          style={{
            fontSize: 18,
            color: tone === "danger" ? "#EF4444" : "#9B7E8C",
          }}
        >
          ›
        </Typography>
      </View>
    </PressableScale>
  );
}

export function SettingsScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const { data: profile, isLoading } = useProfile();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [activeTheme, setActiveTheme] = useState<"Cream" | "Midnight" | "Lavender">(
    isDark ? "Midnight" : "Cream",
  );

  function handleThemeSelect(themeId: "Cream" | "Midnight" | "Lavender") {
    setActiveTheme(themeId);
    if (themeId === "Midnight") {
      Appearance.setColorScheme("dark");
    } else {
      Appearance.setColorScheme("light");
    }
  }

  const displayName = profile?.first_name || profile?.username || "You";
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : null;

  const sectionCardStyle = {
    marginTop: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.7)",
    backgroundColor: isDark ? "rgba(30,33,40,0.85)" : "rgba(255,255,255,0.75)",
    padding: 20,
    shadowColor: "#DDA7A5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  };

  async function handleNotificationToggle(value: boolean) {
    setNotificationsEnabled(value);
    if (value) {
      const result = await requestPermissions();
      if (result.granted) {
        await scheduleDailyLogReminder(20, 0);
      } else {
        setNotificationsEnabled(false);
        Alert.alert(
          "Permission Required",
          "Please enable notifications in your device settings.",
        );
      }
    } else {
      await cancelAllNotifications();
    }
  }

  async function handleLogout() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            await signOut();
            router.replace("/auth/login" as never);
          } catch (error: unknown) {
            const message =
              error instanceof Error ? error.message : "Sign out failed.";
            Alert.alert("Error", message);
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      {/* ── Profile header ────────────────────────────────────────── */}
      <View style={{ marginTop: 16, alignItems: "center", paddingBottom: 8 }}>
        {/* Gradient avatar circle */}
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
            backgroundColor: isDark ? "#A78BFA" : "#DDA7A5",
            shadowColor: isDark ? "#7C6BE8" : "#DDA7A5",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.4,
            shadowRadius: 24,
            elevation: 12,
          }}
        >
          {/* Inner peach circle for gradient approximation */}
          <View
            style={{
              position: "absolute",
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: isDark ? "rgba(167,139,250,0.6)" : "rgba(255,218,185,0.5)",
            }}
          />
          {!isLoading && displayName[0] ? (
            <Typography
              style={{
                fontFamily: "PlayfairDisplay-SemiBold",
                fontSize: 36,
                color: "#FFFFFF",
                lineHeight: 40,
              }}
            >
              {displayName[0].toUpperCase()}
            </Typography>
          ) : null}
        </View>

        {/* Name in Playfair Display */}
        <Typography variant="serifMd">
          {isLoading ? "···" : displayName}
        </Typography>

        {memberSince ? (
          <Typography
            variant="muted"
            style={{ marginTop: 4 }}
          >
            Member since {memberSince}
          </Typography>
        ) : null}
      </View>

      <HeaderBar title="Settings" />

      {/* ── App Preferences ───────────────────────────────────────── */}
      <View style={sectionCardStyle}>
        <SectionLabel label="App Preferences" isDark={isDark} />

        {/* Daily Reminders toggle row */}
        <View
          style={{
            marginBottom: 8,
            borderRadius: 16,
            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,218,185,0.2)",
            paddingHorizontal: 16,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            style={{
              fontSize: 15,
              color: isDark ? "#F2F2F2" : "#2D2327",
            }}
          >
            Daily Reminders
          </Typography>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleNotificationToggle}
            trackColor={{ false: "#D7CFCA", true: "#DDA7A5" }}
            thumbColor="#FFFFFF"
          />
        </View>

        <SettingsRow
          title="Partner Sync"
          isDark={isDark}
          onPress={() => router.push("/partner" as never)}
        />
      </View>

      {/* ── Theme ─────────────────────────────────────────────────── */}
      <View style={sectionCardStyle}>
        <SectionLabel label="Theme" isDark={isDark} />
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 24 }}>
          {[
            { id: "Cream" as const, color: "#FFFDFB", border: "#DDA7A5" },
            { id: "Midnight" as const, color: "#0F1115", border: "#A78BFA" },
            { id: "Lavender" as const, color: "#EDE9FE", border: "#818CF8" },
          ].map((theme) => (
            <PressableScale
              key={theme.id}
              onPress={() => handleThemeSelect(theme.id)}
              style={{ alignItems: "center" }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: theme.color,
                  borderWidth: activeTheme === theme.id ? 3 : 2,
                  borderColor: activeTheme === theme.id ? theme.border : theme.border + "66",
                  shadowColor: activeTheme === theme.id ? theme.border : "transparent",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: activeTheme === theme.id ? 0.4 : 0,
                  shadowRadius: 8,
                  elevation: activeTheme === theme.id ? 4 : 0,
                }}
              />
              <Typography
                variant="helper"
                style={{ marginTop: 8 }}
              >
                {theme.id}
              </Typography>
            </PressableScale>
          ))}
        </View>
      </View>

      {/* ── Account ───────────────────────────────────────────────── */}
      <View style={sectionCardStyle}>
        <SectionLabel label="Account" isDark={isDark} />
        <SettingsRow
          title="Export Data"
          isDark={isDark}
          onPress={() =>
            Alert.alert("Export Data", "Data export coming in a future update.")
          }
        />
        <SettingsRow
          title="Delete All Data"
          tone="danger"
          isDark={isDark}
          onPress={() =>
            Alert.alert(
              "Delete All Data",
              "This permanently deletes all your cycle data. This cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => Alert.alert("Coming Soon"),
                },
              ],
            )
          }
        />
      </View>

      {/* ── Sign Out ──────────────────────────────────────────────── */}
      <PressableScale
        onPress={handleLogout}
        style={{
          marginTop: 16,
          marginBottom: 32,
          alignItems: "center",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(221,167,165,0.3)",
          paddingVertical: 16,
          opacity: isLoggingOut ? 0.5 : 1,
        }}
      >
        <Typography
          style={{
            fontSize: 15,
            fontWeight: "500",
            color: "#9B7E8C",
          }}
        >
          {isLoggingOut ? "Signing out…" : "Sign Out"}
        </Typography>
      </PressableScale>
    </Screen>
  );
}
