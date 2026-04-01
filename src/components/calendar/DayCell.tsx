import { Pressable, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";

import type { CycleStatus } from "@/hooks/useCycleCalendar";
import { Typography } from "@/src/components/ui/Typography";
import { HapticsService } from "@/src/services/haptics/HapticsService";
import { cycleCalendarTheme } from "@/src/theme/tokens";

import { getStatusPaint } from "./calendarUtils";

type DayCellProps = {
  day: number;
  iso: string;
  status: CycleStatus;
  isToday: boolean;
  isSelected: boolean;
  isDark: boolean;
  onPress: (iso: string) => void;
  todayScale: { value: number };
};

export function DayCell({
  day,
  iso,
  status,
  isToday,
  isSelected,
  isDark,
  onPress,
  todayScale,
}: DayCellProps) {
  const theme = isDark ? cycleCalendarTheme.dark : cycleCalendarTheme.light;
  const cellScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);

  const cellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cellScale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const todayStyle = useAnimatedStyle(() => ({
    transform: [{ scale: todayScale.value }],
  }));

  const paint = getStatusPaint(status, isDark);

  return (
    <Pressable
      onPressIn={() => {
        cellScale.value = withSpring(0.92, { damping: 20, stiffness: 280 });
      }}
      onPressOut={() => {
        cellScale.value = withSpring(1, { damping: 20, stiffness: 260 });
      }}
      onPress={() => {
        void HapticsService.selection();
        onPress(iso);
        if (status) {
          pulseOpacity.value = withSequence(
            withTiming(0.6, { duration: 100 }),
            withTiming(1, { duration: 100 }),
          );
        }
      }}
      accessibilityRole="button"
      accessibilityLabel={`Day ${day}${status ? `, ${status.replace("_", " ")}` : ""}${isToday ? ", today" : ""}`}
      className="h-12 flex-1 items-center justify-center"
    >
      <Animated.View
        style={cellStyle}
        className="h-11 w-11 items-center justify-center rounded-full"
      >
        <Animated.View
          style={pulseStyle}
          className="absolute h-9 w-9 rounded-full"
          testID={status ? `status-${iso}` : undefined}
        >
          <View
            className="h-9 w-9 rounded-full"
            style={{
              backgroundColor: paint.fill,
              borderWidth: paint.borderWidth,
              borderColor: paint.borderColor,
              opacity: paint.opacity,
            }}
          />
        </Animated.View>

        {isToday ? (
          <Animated.View
            style={todayStyle}
            className="absolute h-9 w-9 rounded-full"
            testID="today-indicator"
          >
            <View
              className="h-9 w-9 rounded-full"
              style={{
                borderWidth: 2,
                borderColor: theme.todayRing,
              }}
            />
          </Animated.View>
        ) : null}

        {isSelected ? (
          <View
            className="absolute h-10 w-10 rounded-full"
            style={{
              borderWidth: 1.5,
              borderColor: theme.selectedRing,
            }}
          />
        ) : null}

        <Typography
          className={`text-[16px] ${status === "period" ? "font-semibold text-white" : "text-somaCharcoal dark:text-darkTextPrimary"}`}
        >
          {day}
        </Typography>
      </Animated.View>
    </Pressable>
  );
}
