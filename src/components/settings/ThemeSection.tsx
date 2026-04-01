import { View, type ViewStyle } from "react-native";

import { SectionLabel } from "@/src/components/settings/SettingsPrimitives";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { Typography } from "@/src/components/ui/Typography";

type ThemeId = "Cream" | "Midnight";

type ThemeSectionProps = {
  isDark: boolean;
  cardStyle: ViewStyle;
  activeTheme: ThemeId;
  handleThemeSelect: (theme: ThemeId) => void;
};

export function ThemeSection({
  isDark,
  cardStyle,
  activeTheme,
  handleThemeSelect,
}: ThemeSectionProps) {
  return (
    <View style={cardStyle}>
      <SectionLabel label="Theme" isDark={isDark} />
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 24 }}>
        {[
          { id: "Cream" as const, color: "#FFFDFB", border: "#DDA7A5" },
          { id: "Midnight" as const, color: "#0F1115", border: "#A78BFA" },
        ].map((theme) => (
          <PressableScale
            key={theme.id}
            onPress={() => handleThemeSelect(theme.id)}
            style={{ alignItems: "center" }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: theme.color,
                borderWidth: activeTheme === theme.id ? 3 : 2,
                borderColor:
                  activeTheme === theme.id ? theme.border : theme.border + "66",
                shadowColor: activeTheme === theme.id ? theme.border : "transparent",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: activeTheme === theme.id ? 0.4 : 0,
                shadowRadius: 8,
                elevation: activeTheme === theme.id ? 4 : 0,
              }}
            />
            <Typography variant="helper" style={{ marginTop: 8 }}>
              {theme.id}
            </Typography>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}
