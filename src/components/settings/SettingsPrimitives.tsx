import { Switch, TextInput, View } from "react-native";

import { PressableScale } from "@/src/components/ui/PressableScale";
import { Typography } from "@/src/components/ui/Typography";

export function SectionLabel({
  label,
  isDark,
}: {
  label: string;
  isDark: boolean;
}) {
  return (
    <Typography
      style={{
        marginBottom: 12,
        fontSize: 11,
        fontWeight: "600",
        letterSpacing: 2,
        textTransform: "uppercase",
        color: isDark ? "rgba(242,242,242,0.5)" : "#9B7E8C",
      }}
    >
      {label}
    </Typography>
  );
}

export function SettingsRow({
  title,
  tone = "normal",
  isDark,
  onPress,
}: {
  title: string;
  tone?: "normal" | "danger";
  isDark: boolean;
  onPress?: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      style={{
        marginBottom: 8,
        borderRadius: 16,
        backgroundColor: isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(255,218,185,0.2)",
        paddingHorizontal: 16,
        paddingVertical: 16,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography
          style={{
            fontSize: 15,
            color:
              tone === "danger" ? "#EF4444" : isDark ? "#F2F2F2" : "#2D2327",
          }}
        >
          {title}
        </Typography>
        <Typography
          style={{
            fontSize: 18,
            color: tone === "danger" ? "#EF4444" : "#9B7E8C",
          }}
        >
          ›
        </Typography>
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
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isDark: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <View
      style={{
        marginBottom: 8,
        borderRadius: 16,
        backgroundColor: isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(255,218,185,0.2)",
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Typography
        style={{
          fontSize: 15,
          color: isDark ? "#F2F2F2" : "#2D2327",
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
        trackColor={{ false: "#D7CFCA", true: "#DDA7A5" }}
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
            : "rgba(221,167,165,0.3)",
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
          placeholderTextColor="#9B7E8C"
          style={{
            fontSize: 15,
            color: editable
              ? isDark
                ? "#F2F2F2"
                : "#2D2327"
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
