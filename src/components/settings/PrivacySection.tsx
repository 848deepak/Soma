import { View, type ViewStyle } from "react-native";

import {
  GroupedRows,
  SectionLabel,
  SettingsRow,
} from "@/src/components/settings/SettingsPrimitives";

type PrivacySectionProps = {
  isDark: boolean;
  cardStyle: ViewStyle;
  openDataConsent: () => void;
  openDataPractices: () => void;
  openDataRights: () => void;
  openPrivacyPolicy: () => void;
  openTerms: () => void;
  openMedicalDisclaimer: () => void;
};

export function PrivacySection({
  isDark,
  cardStyle,
  openDataConsent,
  openDataPractices,
  openDataRights,
  openPrivacyPolicy,
  openTerms,
  openMedicalDisclaimer,
}: PrivacySectionProps) {
  return (
    <View style={cardStyle}>
      <SectionLabel label="Privacy" isDark={isDark} />
      <GroupedRows isDark={isDark}>
        <SettingsRow
          title="Data Consent Center"
          isDark={isDark}
          onPress={openDataConsent}
        />
        <SettingsRow title="Data Practices" isDark={isDark} onPress={openDataPractices} />
        <SettingsRow
          title="Data Rights Requests"
          isDark={isDark}
          onPress={openDataRights}
        />
        <SettingsRow
          title="Privacy Policy"
          isDark={isDark}
          onPress={openPrivacyPolicy}
        />
        <SettingsRow title="Terms of Use" isDark={isDark} onPress={openTerms} />
        <SettingsRow
          title="Medical Disclaimer"
          isDark={isDark}
          onPress={openMedicalDisclaimer}
          isLast
        />
      </GroupedRows>
    </View>
  );
}
