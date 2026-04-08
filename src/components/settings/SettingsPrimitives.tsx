import type { ReactNode } from "react";
import { Switch, TextInput, View } from "react-native";

import { PressableScale } from "@/src/components/ui/PressableScale";
import { Typography } from "@/src/components/ui/Typography";
import { useAppTheme } from "@/src/context/ThemeContext";

export function SectionLabel({
  label,
  isDark,
}: {
  label: string;
  isDark: boolean;
}) {
  const { colors } = useAppTheme();

  return (
    <Typography
      style={{
        marginBottom: 10,
        fontSize: 11,
        fontWeight: "600",
        letterSpacing: 2,
        textTransform: "uppercase",
        color: isDark ? "rgba(242,242,242,0.52)" : colors.textSecondary,
      }}
    >
      {label}
    </Typography>
  );
}

export function GroupedRows({
  isDark,
  children,
}: {
  isDark: boolean;
  children: ReactNode;
}) {
  const { colors } = useAppTheme();

  return (
    <View
      style={{
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: isDark
          ? "rgba(255,255,255,0.05)"
          : "rgba(255,255,255,0.72)",
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : colors.borderLight,
      }}
    >
      {children}
    </View>
  );
}

export function SettingsRow({
  title,
  value,
  tone = "normal",
  isDark,
  onPress,
  badge,
  showChevron = true,
  isLast = false,
}: {
  title: string;
  value?: string;
  tone?: "normal" | "danger";
  isDark: boolean;
  onPress?: () => void;
  badge?: number;
  showChevron?: boolean;
  isLast?: boolean;
}) {
  const { colors } = useAppTheme();

  return (
    <PressableScale
      onPress={onPress}
      style={{
        paddingHorizontal: 16,
        minHeight: 44,
        paddingVertical: 12,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: isDark
          ? "rgba(255,255,255,0.08)"
          : "rgba(45,35,39,0.08)",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Typography
            style={{
              fontSize: 15,
              fontWeight: "500",
              color: tone === "danger" ? "#EF4444" : colors.textPrimary,
            }}
          >
            {title}
          </Typography>
          {badge !== undefined && badge > 0 && (
            <View
              style={{
                backgroundColor: "#EF4444",
                borderRadius: 12,
                minWidth: 24,
                height: 24,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 6,
              }}
            >
              <Typography
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: "#FFFFFF",
                }}
              >
                {badge}
              </Typography>
            </View>
          )}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {value ? (
            <Typography
              style={{
                fontSize: 15,
                color: colors.textSecondary,
              }}
            >
              {value}
            </Typography>
          ) : null}
          {showChevron ? (
            <Typography
              style={{
                fontSize: 18,
                color: tone === "danger" ? "#EF4444" : colors.textSecondary,
              }}
            >
              ›
            </Typography>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}

export function ToggleRow({
  label,
  value,
  onValueChange,
  isDark,
  disabled = false,
  testID,
  isLast = false,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isDark: boolean;
  disabled?: boolean;
  testID?: string;
  isLast?: boolean;
}) {
  const { colors } = useAppTheme();

  return (
    <View
      style={{
        paddingHorizontal: 16,
        minHeight: 44,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: isDark
          ? "rgba(255,255,255,0.08)"
          : "rgba(45,35,39,0.08)",
      }}
    >
      <Typography
        style={{
          fontSize: 15,
          fontWeight: "500",
          color: colors.textPrimary,
        }}
      >
        {label}
      </Typography>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        testID={testID}
        accessibilityLabel={label}
        trackColor={{ false: "#D7CFCA", true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export function InputField({
  label,
  value,
  onChangeText,
  isDark,
  placeholder,
  keyboardType,
  editable = true,
  errorMessage,
  inputTestID,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  isDark: boolean;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
  editable?: boolean;
  errorMessage?: string | null;
  inputTestID?: string;
}) {
  const { colors } = useAppTheme();

  return (
    <View style={{ marginBottom: 10 }}>
      <Typography variant="helper" style={{ marginBottom: 6 }}>
        {label}
      </Typography>
      <View
        style={{
          borderRadius: 14,
          borderWidth: 1,
          borderColor: isDark
            ? "rgba(255,255,255,0.1)"
            : colors.border,
          backgroundColor: isDark
            ? "rgba(255,255,255,0.04)"
            : "rgba(255,255,255,0.75)",
          paddingHorizontal: 14,
          paddingVertical: 11,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          testID={inputTestID}
          editable={editable}
          placeholder={placeholder}
          keyboardType={keyboardType}
          placeholderTextColor={colors.textSecondary}
          style={{
            fontSize: 15,
            color: editable
              ? isDark
                ? colors.textPrimary
                : colors.textPrimary
              : isDark
                ? "rgba(242,242,242,0.7)"
                : "rgba(45,35,39,0.65)",
          }}
        />
      </View>
      {errorMessage ? (
        <Typography
          style={{
            marginTop: 6,
            fontSize: 12,
            color: "#EF4444",
          }}
        >
          {errorMessage}
        </Typography>
      ) : null}
    </View>
  );
}
