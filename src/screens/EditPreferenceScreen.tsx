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
import { ScreenErrorBoundary } from "@/src/components/ScreenErrorBoundary";

type PreferenceKind = "cycleLength" | "periodDuration";

type EditPreferenceScreenProps = {
  kind: PreferenceKind;
};

const preferenceConfig: Record<
  PreferenceKind,
  {
    title: string;
    label: string;
    min: number;
    max: number;
    profileKey: "cycle_length_average" | "period_duration_average";
  }
> = {
  cycleLength: {
    title: "Cycle Length",
    label: "Cycle length (days)",
    min: 15,
    max: 60,
    profileKey: "cycle_length_average",
  },
  periodDuration: {
    title: "Period Duration",
    label: "Period duration (days)",
    min: 1,
    max: 15,
    profileKey: "period_duration_average",
  },
};

export function EditPreferenceScreen({ kind }: EditPreferenceScreenProps) {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const [value, setValue] = useState("");

  const config = preferenceConfig[kind];

  useEffect(() => {
    if (!profile) return;
    const current = profile[config.profileKey];
    setValue(String(current ?? ""));
  }, [profile, config.profileKey]);

  const parsedValue = Number(value);
  const isValid =
    Number.isFinite(parsedValue) &&
    parsedValue >= config.min &&
    parsedValue <= config.max;

  const baselineValue = profile?.[config.profileKey];
  const hasChanges = useMemo(() => {
    if (!Number.isFinite(parsedValue)) return false;
    return parsedValue !== baselineValue;
  }, [parsedValue, baselineValue]);

  async function handleSave() {
    if (!isValid) {
      void HapticsService.error();
      Alert.alert(
        "Invalid value",
        `${config.title} must be between ${config.min} and ${config.max} days.`,
      );
      return;
    }

    try {
      await HapticsService.impactMedium();
      await updateProfile.mutateAsync({
        [config.profileKey]: parsedValue,
      });
      await HapticsService.success();
      router.back();
    } catch (error: unknown) {
      await HapticsService.error();
      const message =
        error instanceof Error
          ? error.message
          : `Could not update ${config.title.toLowerCase()}.`;
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
            {config.title}
          </Typography>

          <InputField
            label={config.label}
            value={value}
            onChangeText={setValue}
            isDark={isDark}
            keyboardType="numeric"
            editable
            errorMessage={
              isValid || value.length === 0
                ? null
                : `${config.title} must be between ${config.min} and ${config.max} days.`
            }
            inputTestID={`edit-preference-${kind}-input`}
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
              testID={`edit-preference-${kind}-save-button`}
              style={{
                flex: 1,
                alignItems: "center",
                borderRadius: 999,
                backgroundColor: isDark ? "#A78BFA" : "#DDA7A5",
                paddingVertical: 14,
                opacity:
                  !isValid || !hasChanges || updateProfile.isPending ? 0.6 : 1,
              }}
              disabled={!isValid || !hasChanges || updateProfile.isPending}
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

export function EditPreferenceScreenWithErrorBoundary(
  props: EditPreferenceScreenProps
) {
  return (
    <ScreenErrorBoundary screenName="EditPreferenceScreen">
      <EditPreferenceScreen {...props} />
    </ScreenErrorBoundary>
  );
}
