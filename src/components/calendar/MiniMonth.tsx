import { Pressable, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

import type { CycleDataMap } from "@/src/domain/calendar";
import { Typography } from "@/src/components/ui/Typography";
import { buildMonthGrid } from "@/src/features/cycle/uiCycleData";
import { HapticsService } from "@/src/services/haptics/HapticsService";

import { dayIso, MONTH_NAMES } from "./calendarUtils";

const MINI_WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

type MiniMonthProps = {
  monthIndex: number;
  year: number;
  isSelected: boolean;
  cycleDataMap: CycleDataMap;
  themeVariant: "cream" | "midnight" | "lavender";
  onPress: (month: number) => void;
};

export function MiniMonth({
  monthIndex,
  year,
  isSelected,
  cycleDataMap,
  themeVariant,
  onPress,
}: MiniMonthProps) {
  const today = new Date();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstWeekDay = new Date(year, monthIndex, 1).getDay();
  const monthWeeks = buildMonthGrid(daysInMonth, firstWeekDay);
  const normalizedWeeks = [
    ...monthWeeks,
    ...Array.from({ length: Math.max(0, 6 - monthWeeks.length) }, () =>
      Array(7).fill(null),
    ),
  ];
  const pressScale = useSharedValue(1);

  const animatedScale = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  return (
    <Animated.View
      style={animatedScale}
      className="mb-1.5 w-[31.5%]"
    >
      <Pressable
        onPressIn={() => {
          pressScale.value = withSpring(1.05, { damping: 20, stiffness: 250 });
        }}
        onPressOut={() => {
          pressScale.value = withSpring(1, { damping: 20, stiffness: 250 });
        }}
        onPress={() => {
          void HapticsService.selection();
          onPress(monthIndex);
        }}
        className="h-[154px] rounded-2xl px-1 py-1.5"
        style={{
          backgroundColor: isSelected
            ? themeVariant === "midnight"
              ? "rgba(255,255,255,0.15)"
              : themeVariant === "lavender"
                ? "rgba(232,224,248,0.95)"
              : "rgba(255,255,255,0.96)"
            : themeVariant === "midnight"
              ? "rgba(255,255,255,0.08)"
              : themeVariant === "lavender"
                ? "rgba(255,255,255,0.86)"
              : "rgba(255,255,255,0.92)",
          borderWidth: isSelected ? 1 : 0,
          borderColor:
            themeVariant === "midnight"
              ? "rgba(255,255,255,0.3)"
              : "rgba(10,132,255,0.22)",
        }}
      >
        <Typography
          variant="helper"
          className={`mb-1 text-center text-[11px] font-semibold tracking-[0.4px] ${isSelected ? "text-[#0A84FF]" : "dark:text-darkTextPrimary"}`}
          style={
            !isSelected && themeVariant !== "midnight"
              ? { color: "#161616" }
              : undefined
          }
        >
          {MONTH_NAMES[monthIndex]!.slice(0, 3).toUpperCase()}
        </Typography>

        <View className="mb-0.5 flex-row">
          {MINI_WEEKDAY_LABELS.map((label, index) => (
            <View
              key={`mini-weekday-${monthIndex}-${label}-${index}`}
              className="h-3 flex-1 items-center justify-center"
            >
              <Typography
                variant="helper"
                className={`text-[7px] leading-[9px] ${index === 0 ? "font-semibold" : "text-somaMauve/70"}`}
                style={index === 0 ? { color: "#D70015" } : undefined}
              >
                {label}
              </Typography>
            </View>
          ))}
        </View>

        {normalizedWeeks.map((week, weekIndex) => (
          <View
            key={`mini-week-${monthIndex}-${weekIndex}`}
            className="flex-row"
          >
            {week.map((day, dayIndex) => {
              if (!day) {
                return (
                  <View
                    key={`mini-empty-${monthIndex}-${weekIndex}-${dayIndex}`}
                    className="h-[13px] flex-1"
                  />
                );
              }

              const date = new Date(year, monthIndex, day);
              const isSunday = date.getDay() === 0;
              const isToday =
                date.getFullYear() === today.getFullYear() &&
                date.getMonth() === today.getMonth() &&
                date.getDate() === today.getDate();
              const hasStatus = Boolean(
                cycleDataMap[dayIso(year, monthIndex, day)],
              );

              return (
                <View
                  key={`mini-day-${monthIndex}-${weekIndex}-${day}`}
                  className="h-[13px] flex-1 items-center justify-center"
                >
                  <View
                    className="items-center justify-center rounded-full"
                    style={{
                      width: isToday ? 12 : undefined,
                      height: isToday ? 12 : undefined,
                      backgroundColor: isToday ? "#FF453A" : "transparent",
                    }}
                  >
                    <Typography
                      variant="helper"
                      className={`text-[9px] ${
                        isToday
                          ? "font-semibold text-white"
                          : isSunday
                            ? "font-semibold"
                          : hasStatus
                            ? "font-semibold dark:text-darkTextPrimary"
                            : "dark:text-darkTextPrimary"
                      }`}
                      style={{
                        lineHeight: 10,
                        fontVariant: ["tabular-nums"],
                        ...(isSunday && !isToday
                          ? { color: "#D70015" }
                          : themeVariant !== "midnight"
                            ? { color: "#1A1A1A" }
                            : null),
                      }}
                    >
                      {day}
                    </Typography>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </Pressable>
    </Animated.View>
  );
}
