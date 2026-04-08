import { Pressable, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";

import { Typography } from "@/src/components/ui/Typography";
import { useAppTheme } from "@/src/context/ThemeContext";

type CalendarHeaderProps = {
  monthLabel: string;
  yearLabel: string;
  isYearOverview: boolean;
  themeVariant: "cream" | "midnight" | "lavender";
  onPrev: () => void;
  onNext: () => void;
  onToggleView: () => void;
};

export function CalendarHeader({
  monthLabel,
  yearLabel,
  isYearOverview,
  themeVariant,
  onPrev,
  onNext,
  onToggleView,
}: CalendarHeaderProps) {
  const { isDark, colors } = useAppTheme();
  const controlBackground = isDark
    ? "rgba(255,255,255,0.08)"
    : themeVariant === "lavender"
      ? "rgba(255,255,255,0.66)"
      : "rgba(255,255,255,0.76)";
  const monthPillBackground = isDark
    ? "rgba(255,255,255,0.08)"
    : themeVariant === "lavender"
      ? "rgba(232,224,248,0.9)"
      : "rgba(255,250,246,0.9)";

  if (isYearOverview) {
    return (
      <Animated.View
        entering={FadeInUp.duration(300)}
        className="flex-row items-center justify-between pt-4"
      >
        <Typography
          style={{ fontSize: 48, lineHeight: 52, fontWeight: "700" }}
          className="text-somaCharcoal dark:text-darkTextPrimary"
        >
          {yearLabel}
        </Typography>

        <Pressable
          onPress={onToggleView}
          className="h-12 rounded-2xl px-4 items-center justify-center"
          style={{ backgroundColor: controlBackground }}
        >
          <Typography className="font-semibold text-somaMauve dark:text-darkTextSecondary">
            Month
          </Typography>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInUp.duration(300)} className="pt-2">
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={onPrev}
          className="h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: controlBackground }}
        >
          <Typography className="text-xl" style={{ color: colors.textSecondary }}>
            ‹
          </Typography>
        </Pressable>

        <Pressable
          onPress={onToggleView}
          className="rounded-full px-5 py-2"
          style={{ backgroundColor: monthPillBackground }}
        >
          <Animated.View
            key={monthLabel}
            entering={FadeInUp.duration(200).withInitialValues({
              opacity: 0,
              transform: [{ translateY: 8 }],
            })}
            exiting={FadeOutUp.duration(200)}
          >
            <Typography
              variant="serifSm"
              className="text-[42px] tracking-[0.2px] text-somaCharcoal dark:text-darkTextPrimary"
            >
              {monthLabel}
            </Typography>
          </Animated.View>
        </Pressable>

        <Pressable
          onPress={onNext}
          className="h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: controlBackground }}
        >
          <Typography className="text-xl" style={{ color: colors.textSecondary }}>
            ›
          </Typography>
        </Pressable>
      </View>
    </Animated.View>
  );
}
