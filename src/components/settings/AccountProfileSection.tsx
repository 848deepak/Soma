import { View, type ViewStyle } from "react-native";

import {
  GroupedRows,
  SectionLabel,
  SettingsRow,
} from "@/src/components/settings/SettingsPrimitives";

type AccountProfileSectionProps = {
  isDark: boolean;
  sectionStyle: ViewStyle;
  fullName: string;
  username: string;
  dateOfBirth: string;
  openEditProfile: () => void;
};

export function AccountProfileSection({
  isDark,
  sectionStyle,
  fullName,
  username,
  dateOfBirth,
  openEditProfile,
}: AccountProfileSectionProps) {
  return (
    <View style={sectionStyle}>
      <SectionLabel label="Profile" isDark={isDark} />
      <GroupedRows isDark={isDark}>
        <SettingsRow
          title="Name"
          value={fullName}
          isDark={isDark}
          onPress={openEditProfile}
        />
        <SettingsRow
          title="Username"
          value={username}
          isDark={isDark}
          onPress={openEditProfile}
        />
        <SettingsRow
          title="DOB"
          value={dateOfBirth}
          isDark={isDark}
          onPress={openEditProfile}
          isLast
        />
      </GroupedRows>
    </View>
  );
}
