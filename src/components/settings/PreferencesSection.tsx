import { View, type ViewStyle } from "react-native";

import {
  GroupedRows,
  SectionLabel,
  SettingsRow,
} from "@/src/components/settings/SettingsPrimitives";

type PreferencesSectionProps = {
  isDark: boolean;
  sectionStyle: ViewStyle;
  cycleLength: string;
  periodDuration: string;
  openCycleLength: () => void;
  openPeriodDuration: () => void;
};

export function PreferencesSection({
  isDark,
  sectionStyle,
  cycleLength,
  periodDuration,
  openCycleLength,
  openPeriodDuration,
}: PreferencesSectionProps) {
  return (
    <View style={sectionStyle}>
      <SectionLabel label="Preferences" isDark={isDark} />
      <GroupedRows isDark={isDark}>
        <SettingsRow
          title="Cycle Length"
          value={`${cycleLength} days`}
          isDark={isDark}
          onPress={openCycleLength}
        />
        <SettingsRow
          title="Period Duration"
          value={`${periodDuration} days`}
          isDark={isDark}
          onPress={openPeriodDuration}
          isLast
        />
      </GroupedRows>
    </View>
  );
}
