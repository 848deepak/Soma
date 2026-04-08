import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from "react-native-reanimated";

import type { CycleDataMap } from "@/src/domain/calendar";

import { dayIso } from "./calendarUtils";
import { DayCell } from "./DayCell";

type DayRowProps = {
  week: (number | null)[];
  weekIndex: number;
  month: number;
  year: number;
  selectedDateIso: string | null;
  todayIso: string;
  cycleDataMap: CycleDataMap;
  themeVariant: "cream" | "midnight" | "lavender";
  onPressDate: (iso: string) => void;
  todayScale: { value: number };
  monthAnimationSeed: string;
};

export function DayRow({
  week,
  weekIndex,
  month,
  year,
  selectedDateIso,
  todayIso,
  cycleDataMap,
  themeVariant,
  onPressDate,
  todayScale,
  monthAnimationSeed,
}: DayRowProps) {
  const rowOpacity = useSharedValue(0.5);

  useEffect(() => {
    rowOpacity.value = 0.35;
    rowOpacity.value = withDelay(
      weekIndex * 30,
      withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [weekIndex, monthAnimationSeed, rowOpacity]);

  const rowStyle = useAnimatedStyle(() => ({ opacity: rowOpacity.value }));

  return (
    <Animated.View style={rowStyle} className="mb-[2px] flex-row">
      {week.map((day, dayIndex) => {
        if (!day) {
          return (
            <View
              key={`empty-${weekIndex}-${dayIndex}`}
              className="h-12 flex-1"
            />
          );
        }

        const iso = dayIso(year, month, day);
        return (
          <DayCell
            key={`day-${weekIndex}-${day}`}
            day={day}
            iso={iso}
            isSunday={dayIndex === 0}
            status={cycleDataMap[iso] ?? null}
            isToday={iso === todayIso}
            isSelected={selectedDateIso === iso}
            themeVariant={themeVariant}
            onPress={onPressDate}
            todayScale={todayScale}
          />
        );
      })}
    </Animated.View>
  );
}
