import { View, type ViewStyle } from "react-native";

import { SettingsRow, SectionLabel, ToggleRow } from "@/src/components/settings/SettingsPrimitives";
import { usePendingConnections } from "@/hooks/usePendingConnections";

type NotificationsSectionProps = {
  isDark: boolean;
  cardStyle: ViewStyle;
  notificationsEnabled: boolean;
  handleNotificationToggle: (value: boolean) => void;
  isNotificationSaving: boolean;
  analyticsEnabled: boolean;
  handleAnalyticsToggle: (value: boolean) => void;
  openPartnerSync: () => void;
};

export function NotificationsSection({
  isDark,
  cardStyle,
  notificationsEnabled,
  handleNotificationToggle,
  isNotificationSaving,
  analyticsEnabled,
  handleAnalyticsToggle,
  openPartnerSync,
}: NotificationsSectionProps) {
  const { data: pendingData } = usePendingConnections();
  const pendingCount = pendingData?.incoming?.length ?? 0;

  return (
    <View style={cardStyle}>
      <SectionLabel label="Notifications" isDark={isDark} />

      <ToggleRow
        label="Daily Reminders"
        value={notificationsEnabled}
        onValueChange={handleNotificationToggle}
        isDark={isDark}
        disabled={isNotificationSaving}
        testID="settings-daily-reminders-toggle"
      />

      <SettingsRow 
        title="Partner Sync" 
        isDark={isDark} 
        onPress={openPartnerSync}
        badge={pendingCount}
      />

      <ToggleRow
        label="Analytics Consent"
        value={analyticsEnabled}
        onValueChange={handleAnalyticsToggle}
        isDark={isDark}
        testID="settings-analytics-consent-toggle"
      />
    </View>
  );
}
