import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, View } from "react-native";

import { useProfile, useUpdateProfile } from "@/src/domain/auth";
import { InputField } from "@/src/components/settings/SettingsPrimitives";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { Screen } from "@/src/components/ui/Screen";
import { Typography } from "@/src/components/ui/Typography";
import { useAppTheme } from "@/src/context/ThemeContext";
import { HapticsService } from "@/src/services/haptics/HapticsService";
import { validateIsoDate, validateMinimumAge } from "@/src/utils/validation";
import { ScreenErrorBoundary } from "@/src/components/ScreenErrorBoundary";

export function EditProfileScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const isUsernameLocked = Boolean(profile?.username?.trim());

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? "");
    setUsername(profile.username ?? "");
    setDateOfBirth(profile.date_of_birth ?? "");
  }, [profile]);

  const validationErrors = useMemo(() => {
    const normalizedFirstName = firstName.trim();
    const normalizedUsername = username
      .trim()
      .replace(/\s+/g, "")
      .toLowerCase();
    const normalizedDob = dateOfBirth.trim();

    return {
      firstName: normalizedFirstName ? null : "Please enter your first name.",
      username:
        isUsernameLocked || normalizedUsername
          ? null
          : "Please choose a username.",
      dateOfBirth:
        normalizedDob && !validateIsoDate(normalizedDob)
          ? "Use YYYY-MM-DD format for date of birth."
          : normalizedDob && !validateMinimumAge(normalizedDob, 13)
            ? "You must be at least 13 years old to use Soma without parental consent."
            : null,
    };
  }, [firstName, username, dateOfBirth, isUsernameLocked]);

  const hasChanges = useMemo(() => {
    if (!profile) return false;
    return (
      firstName.trim() !== (profile.first_name ?? "") ||
      (!isUsernameLocked &&
        username.trim().toLowerCase() !==
          (profile.username ?? "").trim().toLowerCase()) ||
      dateOfBirth.trim() !== (profile.date_of_birth ?? "")
    );
  }, [profile, firstName, username, dateOfBirth, isUsernameLocked]);

  async function handleSave() {
    const normalizedFirstName = firstName.trim();
    const normalizedUsername = username
      .trim()
      .replace(/\s+/g, "")
      .toLowerCase();
    const normalizedDob = dateOfBirth.trim();
    const resolvedUsername = isUsernameLocked
      ? (profile?.username ?? "")
      : normalizedUsername;

    if (!normalizedFirstName) {
      void HapticsService.error();
      Alert.alert("Missing name", "Please enter your first name.");
      return;
    }
    if (!resolvedUsername) {
      void HapticsService.error();
      Alert.alert("Missing username", "Please choose a username.");
      return;
    }
    if (normalizedDob && !validateIsoDate(normalizedDob)) {
      void HapticsService.error();
      Alert.alert("Invalid date", "Use YYYY-MM-DD format for date of birth.");
      return;
    }
    if (normalizedDob && !validateMinimumAge(normalizedDob, 13)) {
      void HapticsService.error();
      Alert.alert(
        "Age requirement",
        "You must be at least 13 years old to use Soma without parental consent.",
      );
      return;
    }

    try {
      await HapticsService.impactMedium();
      const basePayload = {
        first_name: normalizedFirstName,
        date_of_birth: normalizedDob || null,
      };

      await updateProfile.mutateAsync(
        isUsernameLocked
          ? basePayload
          : { ...basePayload, username: resolvedUsername },
      );
      await HapticsService.success();
      router.back();
    } catch (error: unknown) {
      await HapticsService.error();
      const message =
        error instanceof Error
          ? error.message
          : "Could not update your profile.";
      Alert.alert("Save Failed", message);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={96}
    >
      <Screen showAurora={false} horizontalPadding={16}>
        <View style={{ marginTop: 8 }}>
          <Typography variant="serifSm" style={{ marginBottom: 16 }}>
            Edit Profile
          </Typography>

          <InputField
            label="First name"
            value={firstName}
            onChangeText={setFirstName}
            isDark={isDark}
            placeholder="Your name"
            editable
            errorMessage={validationErrors.firstName}
            inputTestID="edit-profile-first-name-input"
          />

          <InputField
            label="Username"
            value={username}
            onChangeText={setUsername}
            isDark={isDark}
            placeholder="yourname"
            editable={!isUsernameLocked}
            errorMessage={isUsernameLocked ? undefined : validationErrors.username}
            inputTestID="edit-profile-username-input"
          />

          {isUsernameLocked ? (
            <Typography variant="helper" style={{ marginTop: -2, marginBottom: 8 }}>
              Username is permanent after account creation.
            </Typography>
          ) : null}

          <InputField
            label="Date of birth (YYYY-MM-DD)"
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            isDark={isDark}
            placeholder="1995-08-21"
            editable
            errorMessage={validationErrors.dateOfBirth}
            inputTestID="edit-profile-dob-input"
          />

          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            <PressableScale
              onPress={() => router.back()}
              style={{
                flex: 1,
                alignItems: "center",
                borderRadius: 999,
                borderWidth: 1,
                borderColor: isDark
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(221,167,165,0.5)",
                paddingVertical: 14,
              }}
            >
              <Typography style={{ fontSize: 15, fontWeight: "600" }}>
                Cancel
              </Typography>
            </PressableScale>

            <PressableScale
              onPress={handleSave}
              testID="edit-profile-save-button"
              style={{
                flex: 1,
                alignItems: "center",
                borderRadius: 999,
                backgroundColor: isDark ? "#A78BFA" : "#DDA7A5",
                paddingVertical: 14,
                opacity: !hasChanges || updateProfile.isPending ? 0.6 : 1,
              }}
              disabled={!hasChanges || updateProfile.isPending}
            >
              <Typography style={{ fontSize: 15, fontWeight: "600", color: "#FFFFFF" }}>
                {updateProfile.isPending ? "Saving..." : "Save"}
              </Typography>
            </PressableScale>
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

export function EditProfileScreenWithErrorBoundary() {
  return (
    <ScreenErrorBoundary screenName="EditProfileScreen">
      <EditProfileScreen />
    </ScreenErrorBoundary>
  );
}
