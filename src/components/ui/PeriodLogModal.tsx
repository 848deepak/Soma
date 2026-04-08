import { useEffect, useMemo, useState } from "react";
import { Modal, TextInput, View } from "react-native";

import { PressableScale } from "@/src/components/ui/PressableScale";
import { Typography } from "@/src/components/ui/Typography";
import { useAppTheme } from "@/src/context/ThemeContext";

type PeriodLogValues = {
  startDate: string;
  endDate: string;
};

type PeriodLogModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (values: PeriodLogValues) => void;
  isSubmitting?: boolean;
};

function localIsoToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localIsoDaysAgo(daysAgo: number): string {
  const now = new Date();
  now.setDate(now.getDate() - daysAgo);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const candidate = new Date(year, month - 1, day);
  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  );
}

export function PeriodLogModal({
  visible,
  onClose,
  onSubmit,
  isSubmitting = false,
}: PeriodLogModalProps) {
  const { isDark } = useAppTheme();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (visible) {
      setStartDate(localIsoToday());
      setEndDate("");
    } else {
      setStartDate("");
      setEndDate("");
    }
  }, [visible]);

  const normalizedStartDate = startDate.trim();
  const normalizedEndDate = endDate.trim();

  const validationError = useMemo(() => {
    if (!normalizedStartDate) {
      return "Start date is required.";
    }

    if (!isValidIsoDate(normalizedStartDate)) {
      return "Use YYYY-MM-DD format for start date.";
    }

    if (normalizedEndDate && !isValidIsoDate(normalizedEndDate)) {
      return "Use YYYY-MM-DD format for end date.";
    }

    if (normalizedEndDate && normalizedEndDate < normalizedStartDate) {
      return "End date cannot be before start date.";
    }

    return null;
  }, [normalizedStartDate, normalizedEndDate]);

  function submit() {
    if (isSubmitting || validationError) return;
    onSubmit({ startDate: normalizedStartDate, endDate: normalizedEndDate });
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,0.45)",
        }}
      >
        <View
          style={{
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderWidth: 1,
            borderColor: isDark
              ? "rgba(255,255,255,0.12)"
              : "rgba(221,167,165,0.3)",
            backgroundColor: isDark
              ? "rgba(26,29,36,0.98)"
              : "rgba(255,253,251,0.98)",
            paddingHorizontal: 24,
            paddingTop: 18,
            paddingBottom: 32,
          }}
        >
          <Typography
            style={{
              fontFamily: "PlayfairDisplay-SemiBold",
              fontSize: 24,
              color: isDark ? "#F2F2F2" : "#2D2327",
              marginBottom: 6,
            }}
          >
            Log Period
          </Typography>
          <Typography variant="helper" style={{ marginBottom: 14 }}>
            Enter start date. End date is optional.
          </Typography>

          <View style={{ marginBottom: 10 }}>
            <Typography variant="helper" style={{ marginBottom: 6 }}>
              Start date (YYYY-MM-DD)
            </Typography>
            <TextInput
              value={startDate}
              onChangeText={setStartDate}
              placeholder="2026-03-10"
              testID="period-log-start-date-input"
              placeholderTextColor="#9B7E8C"
              autoCapitalize="none"
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: isDark
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(221,167,165,0.3)",
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(255,255,255,0.8)",
                paddingHorizontal: 14,
                paddingVertical: 11,
                color: isDark ? "#F2F2F2" : "#2D2327",
              }}
            />
          </View>

          <View
            style={{
              marginTop: -2,
              marginBottom: 14,
              flexDirection: "row",
              gap: 8,
            }}
          >
            <PressableScale
              onPress={() => setStartDate(localIsoToday())}
              testID="period-log-quick-today"
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: isDark
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(221,167,165,0.45)",
                paddingHorizontal: 12,
                paddingVertical: 7,
              }}
            >
              <Typography variant="helper">Today</Typography>
            </PressableScale>

            <PressableScale
              onPress={() => setStartDate(localIsoDaysAgo(1))}
              testID="period-log-quick-yesterday"
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: isDark
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(221,167,165,0.45)",
                paddingHorizontal: 12,
                paddingVertical: 7,
              }}
            >
              <Typography variant="helper">Yesterday</Typography>
            </PressableScale>

            <PressableScale
              onPress={() => setStartDate(localIsoDaysAgo(7))}
              testID="period-log-quick-week-ago"
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: isDark
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(221,167,165,0.45)",
                paddingHorizontal: 12,
                paddingVertical: 7,
              }}
            >
              <Typography variant="helper">1 week ago</Typography>
            </PressableScale>
          </View>

          <View style={{ marginBottom: 16 }}>
            <Typography variant="helper" style={{ marginBottom: 6 }}>
              End date (optional)
            </Typography>
            <TextInput
              value={endDate}
              onChangeText={setEndDate}
              placeholder="2026-03-14"
              testID="period-log-end-date-input"
              placeholderTextColor="#9B7E8C"
              autoCapitalize="none"
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: isDark
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(221,167,165,0.3)",
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(255,255,255,0.8)",
                paddingHorizontal: 14,
                paddingVertical: 11,
                color: isDark ? "#F2F2F2" : "#2D2327",
              }}
            />
          </View>

          {validationError ? (
            <Typography
              style={{ marginTop: -8, marginBottom: 12, color: "#EF4444" }}
            >
              {validationError}
            </Typography>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <PressableScale
              onPress={onClose}
              style={{
                flex: 1,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: isDark
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(221,167,165,0.45)",
                paddingVertical: 13,
                alignItems: "center",
              }}
            >
              <Typography variant="helper">Cancel</Typography>
            </PressableScale>

            <PressableScale
              onPress={submit}
              testID="period-log-save-button"
              disabled={Boolean(validationError) || isSubmitting}
              style={{
                flex: 1,
                borderRadius: 999,
                backgroundColor: isDark ? "#A78BFA" : "#DDA7A5",
                paddingVertical: 13,
                alignItems: "center",
                opacity: isSubmitting || validationError ? 0.6 : 1,
              }}
            >
              <Typography style={{ color: "#FFF", fontWeight: "600" }}>
                {isSubmitting ? "Saving…" : "Save"}
              </Typography>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  );
}
