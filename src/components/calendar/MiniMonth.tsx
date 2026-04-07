import { Pressable, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

import type { CycleDataMap } from "@/hooks/useCycleCalendar";
import { Typography } from "@/src/components/ui/Typography";
import { buildMonthGrid } from "@/src/features/cycle/uiCycleData";
import { HapticsService } from "@/src/services/haptics/HapticsService";

import { buildMiniMonthDots, dayIso, MONTH_NAMES } from "./calendarUtils";

type MiniMonthProps = {
  monthIndex: number;
  year: number;
  isSelected: boolean;
  cycleDataMap: CycleDataMap;
  isDark: boolean;
  onPress: (month: number) => void;
};

export function MiniMonth({
  monthIndex,
  year,
  isSelected,
  cycleDataMap,
  isDark,
  onPress,
}: MiniMonthProps) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstWeekDay = new Date(year, monthIndex, 1).getDay();
  const monthWeeks = buildMonthGrid(daysInMonth, firstWeekDay);
  const pressScale = useSharedValue(1);

  const animatedScale = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const activeDotCount = Math.min(
    3,
    Math.ceil(buildMiniMonthDots(year, monthIndex, cycleDataMap) / 4),
  );

  return (
    <Animated.View
      style={animatedScale}
      className="mb-3 w-[31%] rounded-2xl px-2 py-2"
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
        className="rounded-2xl px-1 py-2"
        style={{
          backgroundColor: isSelected
            ? isDark
              ? "rgba(182,123,129,0.24)"
              : "rgba(232,160,160,0.18)"
            : "transparent",
        }}
      >
        <Typography
          variant="helper"
          className={`mb-1 text-center text-[13px] font-semibold ${isSelected ? "text-[#C56D74]" : "text-somaMauve"}`}
        >
          {MONTH_NAMES[monthIndex]!.slice(0, 3)}
        </Typography>

        {monthWeeks.map((week, weekIndex) => (
          <View
            key={`mini-week-${monthIndex}-${weekIndex}`}
            className="flex-row justify-between"
          >
            {week.map((day, dayIndex) => {
              if (!day) {
                return (
                  <View
                    key={`mini-empty-${monthIndex}-${weekIndex}-${dayIndex}`}
                    className="h-4 w-4"
                  />
                );
              }

              const hasStatus = Boolean(
                cycleDataMap[dayIso(year, monthIndex, day)],
              );

              return (
                <View
                  key={`mini-day-${monthIndex}-${weekIndex}-${day}`}
                  className="h-4 w-4 items-center justify-center"
                >
                  <Typography
                    className={`text-[10px] ${
                      hasStatus
                        ? "font-semibold text-somaCharcoal dark:text-darkTextPrimary"
                        : "text-somaMauve"
                    }`}
                  >
                    {day}
                  </Typography>
                </View>
              );
            })}
          </View>
        ))}

        <View className="mt-1 flex-row justify-center">
          {Array.from({ length: 3 }).map((_, idx) => (
            <View
              key={`month-dot-${monthIndex}-${idx}`}
              className="mx-[2px] h-[4px] w-[4px] rounded-full"
              style={{
                backgroundColor:
                  idx < activeDotCount
                    ? isDark
                      ? "rgba(244,182,140,0.8)"
                      : "rgba(197,109,116,0.85)"
                    : "rgba(191,174,184,0.3)",
              }}
            />
          ))}
        </View>
      </Pressable>
    </Animated.View>
  );
}
