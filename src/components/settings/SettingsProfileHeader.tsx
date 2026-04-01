import { View } from "react-native";

import { Typography } from "@/src/components/ui/Typography";

type SettingsProfileHeaderProps = {
  isDark: boolean;
  isLoading: boolean;
  displayName: string;
  memberSince: string | null;
};

export function SettingsProfileHeader({
  isDark,
  isLoading,
  displayName,
  memberSince,
}: SettingsProfileHeaderProps) {
  return (
    <View style={{ marginTop: 16, alignItems: "center", paddingBottom: 8 }}>
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
          backgroundColor: isDark ? "#A78BFA" : "#DDA7A5",
          shadowColor: isDark ? "#7C6BE8" : "#DDA7A5",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.4,
          shadowRadius: 24,
          elevation: 12,
        }}
      >
        <View
          style={{
            position: "absolute",
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: isDark
              ? "rgba(167,139,250,0.6)"
              : "rgba(255,218,185,0.5)",
          }}
        />
        {!isLoading && displayName[0] ? (
          <Typography
            style={{
              fontFamily: "PlayfairDisplay-SemiBold",
              fontSize: 36,
              color: "#FFFFFF",
              lineHeight: 40,
            }}
          >
            {displayName[0].toUpperCase()}
          </Typography>
        ) : null}
      </View>

      <Typography variant="serifMd">{isLoading ? "···" : displayName}</Typography>

      {memberSince ? (
        <Typography variant="muted" style={{ marginTop: 4 }}>
          Member since {memberSince}
        </Typography>
      ) : null}
    </View>
  );
}
