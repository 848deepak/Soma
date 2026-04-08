import { View, type ViewStyle } from "react-native";

import {
  GroupedRows,
  SectionLabel,
  SettingsRow,
} from "@/src/components/settings/SettingsPrimitives";
import { Typography } from "@/src/components/ui/Typography";

type CycleActionsSectionProps = {
  isDark: boolean;
  cardStyle: ViewStyle;
  isResetPending: boolean;
  isStartPending: boolean;
  isEndPending: boolean;
  activeCycleStartDate?: string;
  handleResetPredictions: () => void;
  handleStartPeriodToday: () => void;
  handleEndPeriodToday: () => void;
};

export function CycleActionsSection({
  isDark,
  cardStyle,
  isResetPending,
  isStartPending,
  isEndPending,
  activeCycleStartDate,
  handleResetPredictions,
  handleStartPeriodToday,
  handleEndPeriodToday,
}: CycleActionsSectionProps) {
  return (
    <View style={cardStyle}>
      <SectionLabel label="Cycle Actions" isDark={isDark} />
      <GroupedRows isDark={isDark}>
        <SettingsRow
          title={isResetPending ? "Resetting Predictions…" : "Reset Predictions"}
          isDark={isDark}
          onPress={handleResetPredictions}
        />

        <SettingsRow
          title={isStartPending ? "Starting…" : "Start Period Today"}
          isDark={isDark}
          onPress={handleStartPeriodToday}
          isLast={!activeCycleStartDate}
        />

        {activeCycleStartDate ? (
          <SettingsRow
            title={isEndPending ? "Ending…" : "End Current Period"}
            isDark={isDark}
            onPress={handleEndPeriodToday}
            isLast
          />
        ) : null}
      </GroupedRows>

      <Typography variant="helper" style={{ marginTop: 6 }}>
        {activeCycleStartDate
          ? `Active cycle started ${activeCycleStartDate}`
          : "No active cycle right now."}
      </Typography>

      <Typography variant="helper" style={{ marginTop: 6 }}>
        Reset Predictions updates forecast dates only. It never deletes logs.
      </Typography>
    </View>
  );
}
