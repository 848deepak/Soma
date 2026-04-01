import { View, type ViewStyle } from "react-native";

import { InputField, SectionLabel } from "@/src/components/settings/SettingsPrimitives";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { Typography } from "@/src/components/ui/Typography";

type ValidationErrors = {
  cycleLength: string | null;
  periodDuration: string | null;
};

type PreferencesSectionProps = {
  isDark: boolean;
  cardStyle: ViewStyle;
  cycleLength: string;
  setCycleLength: (value: string) => void;
  periodDuration: string;
  setPeriodDuration: (value: string) => void;
  isEditMode: boolean;
  validationErrors: ValidationErrors;
  handleCancelEdit: () => void;
  handleSaveProfile: () => void;
  isSaveDisabled: boolean;
  isSavePending: boolean;
  isFormValid: boolean;
  firstValidationError: string | null;
};

export function PreferencesSection({
  isDark,
  cardStyle,
  cycleLength,
  setCycleLength,
  periodDuration,
  setPeriodDuration,
  isEditMode,
  validationErrors,
  handleCancelEdit,
  handleSaveProfile,
  isSaveDisabled,
  isSavePending,
  isFormValid,
  firstValidationError,
}: PreferencesSectionProps) {
  return (
    <View style={cardStyle}>
      <SectionLabel label="Preferences" isDark={isDark} />
      <InputField
        label="Cycle length (days)"
        value={cycleLength}
        onChangeText={setCycleLength}
        isDark={isDark}
        keyboardType="numeric"
        editable={isEditMode}
        errorMessage={validationErrors.cycleLength}
        inputTestID="settings-cycle-length-input"
      />
      <InputField
        label="Period duration (days)"
        value={periodDuration}
        onChangeText={setPeriodDuration}
        isDark={isDark}
        keyboardType="numeric"
        editable={isEditMode}
        errorMessage={validationErrors.periodDuration}
        inputTestID="settings-period-duration-input"
      />

      {isEditMode ? (
        <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
          <PressableScale
            onPress={handleCancelEdit}
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
            onPress={handleSaveProfile}
            testID="settings-save-button"
            style={{
              flex: 1,
              alignItems: "center",
              borderRadius: 999,
              backgroundColor: isDark ? "#A78BFA" : "#DDA7A5",
              paddingVertical: 14,
              opacity: isSaveDisabled ? 0.6 : 1,
            }}
            disabled={isSaveDisabled}
          >
            <Typography style={{ fontSize: 15, fontWeight: "600", color: "#FFFFFF" }}>
              {isSavePending ? "Saving…" : "Save Changes"}
            </Typography>
          </PressableScale>
        </View>
      ) : null}
      {!isFormValid && firstValidationError ? (
        <Typography variant="helper" style={{ marginTop: 8, color: "#EF4444" }}>
          {firstValidationError}
        </Typography>
      ) : null}
    </View>
  );
}
