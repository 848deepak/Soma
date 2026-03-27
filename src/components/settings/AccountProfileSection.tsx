import { View, type ViewStyle } from "react-native";

import { PressableScale } from "@/src/components/ui/PressableScale";
import { Typography } from "@/src/components/ui/Typography";
import { InputField, SectionLabel } from "@/src/components/settings/SettingsPrimitives";

type ValidationErrors = {
  firstName: string | null;
  username: string | null;
  dateOfBirth: string | null;
};

type AccountProfileSectionProps = {
  isDark: boolean;
  cardStyle: ViewStyle;
  isEditMode: boolean;
  handleEditProfile: () => void;
  firstName: string;
  setFirstName: (value: string) => void;
  username: string;
  setUsername: (value: string) => void;
  dateOfBirth: string;
  setDateOfBirth: (value: string) => void;
  isUsernameLocked: boolean;
  validationErrors: ValidationErrors;
};

export function AccountProfileSection({
  isDark,
  cardStyle,
  isEditMode,
  handleEditProfile,
  firstName,
  setFirstName,
  username,
  setUsername,
  dateOfBirth,
  setDateOfBirth,
  isUsernameLocked,
  validationErrors,
}: AccountProfileSectionProps) {
  return (
    <View style={cardStyle}>
      <View
        style={{
          marginBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <SectionLabel label="Account" isDark={isDark} />
        {!isEditMode ? (
          <PressableScale
            onPress={handleEditProfile}
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: isDark
                ? "rgba(255,255,255,0.2)"
                : "rgba(221,167,165,0.45)",
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Typography variant="helper" style={{ fontWeight: "600" }}>
              Edit
            </Typography>
          </PressableScale>
        ) : null}
      </View>
      <InputField
        label="First name"
        value={firstName}
        onChangeText={setFirstName}
        isDark={isDark}
        placeholder="Your name"
        editable={isEditMode}
        errorMessage={validationErrors.firstName}
        inputTestID="settings-first-name-input"
      />
      <InputField
        label="Username"
        value={username}
        onChangeText={setUsername}
        isDark={isDark}
        placeholder="yourname"
        editable={isEditMode && !isUsernameLocked}
        errorMessage={isUsernameLocked ? undefined : validationErrors.username}
        inputTestID="settings-username-input"
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
        editable={isEditMode}
        errorMessage={validationErrors.dateOfBirth}
        inputTestID="settings-dob-input"
      />
    </View>
  );
}
