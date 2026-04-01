import { Pressable, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";

import { Typography } from "@/src/components/ui/Typography";

type CalendarHeaderProps = {
  title: string;
  monthLabel: string;
  isDark: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleView: () => void;
};

export function CalendarHeader({
  title,
  monthLabel,
  isDark,
  onPrev,
  onNext,
  onToggleView,
}: CalendarHeaderProps) {
  return (
    <Animated.View entering={FadeInUp.duration(300)} className="pt-2">
      <Typography
        variant="serifMd"
        className="text-somaCharcoal dark:text-darkTextPrimary"
      >
        {title}
      </Typography>

      <View className="mt-5 flex-row items-center justify-between">
        <Pressable
          onPress={onPrev}
          className="h-12 w-12 items-center justify-center rounded-full"
          style={{
            backgroundColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(255,255,255,0.76)",
          }}
        >
          <Typography className="text-xl text-somaMauve">‹</Typography>
        </Pressable>

        <Pressable
          onPress={onToggleView}
          className="rounded-full px-4 py-2"
          style={{
            backgroundColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(255,250,246,0.9)",
          }}
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
              className="text-[38px] tracking-[0.2px] text-somaCharcoal dark:text-darkTextPrimary"
            >
              {monthLabel}
            </Typography>
          </Animated.View>
        </Pressable>

        <Pressable
          onPress={onNext}
          className="h-12 w-12 items-center justify-center rounded-full"
          style={{
            backgroundColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(255,255,255,0.76)",
          }}
        >
          <Typography className="text-xl text-somaMauve">›</Typography>
        </Pressable>
      </View>
    </Animated.View>
  );
}
