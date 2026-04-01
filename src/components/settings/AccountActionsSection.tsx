import { View, type ViewStyle } from "react-native";

import { SectionLabel, SettingsRow } from "@/src/components/settings/SettingsPrimitives";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { Typography } from "@/src/components/ui/Typography";

type AccountActionsSectionProps = {
  isDark: boolean;
  cardStyle: ViewStyle;
  isDeletePending: boolean;
  isLoggingOut: boolean;
  isAnonymous?: boolean;
  handleExportData: () => void;
  handleSendFeedback: () => void;
  handleDeleteAllData: () => void;
  handleLogout: () => void;
  handleSignIn?: () => void;
};

export function AccountActionsSection({
  isDark,
  cardStyle,
  isDeletePending,
  isLoggingOut,
  isAnonymous,
  handleExportData,
  handleSendFeedback,
  handleDeleteAllData,
  handleLogout,
  handleSignIn,
}: AccountActionsSectionProps) {
  return (
    <>
      <View style={cardStyle}>
        <SectionLabel label="Account" isDark={isDark} />
        <SettingsRow title="Export Data" isDark={isDark} onPress={handleExportData} />
        <SettingsRow
          title="Report an Issue"
          isDark={isDark}
          onPress={handleSendFeedback}
        />
        <SettingsRow
          title="Delete Account"
          tone="danger"
          isDark={isDark}
          onPress={handleDeleteAllData}
        />

        <Typography variant="helper" style={{ marginTop: 6 }}>
          {isDeletePending
            ? "Deleting your data…"
            : "Danger zone: Delete all data is permanent and cannot be undone."}
        </Typography>
      </View>

      {isAnonymous ? (
        <PressableScale
          onPress={handleSignIn}
          style={{
            marginTop: 16,
            marginBottom: 32,
            alignItems: "center",
            borderRadius: 16,
            backgroundColor: isDark ? "#A78BFA" : "#DDA7A5",
            paddingVertical: 16,
            opacity: isLoggingOut ? 0.5 : 1,
            shadowColor: isDark ? "#7C6BE8" : "#DDA7A5",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 6,
          }}
        >
          <Typography
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: "#FFFFFF",
            }}
          >
            {isLoggingOut ? "Signing in…" : "Create Account / Sign In"}
          </Typography>
        </PressableScale>
      ) : (
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
      )}
    </>
  );
}
