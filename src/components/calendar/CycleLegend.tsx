import { View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { Typography } from "@/src/components/ui/Typography";
import { cycleCalendarTheme } from "@/src/theme/tokens";

type CycleLegendProps = {
  isDark: boolean;
};

export function CycleLegend({ isDark }: CycleLegendProps) {
  const theme = isDark ? cycleCalendarTheme.dark : cycleCalendarTheme.light;

  return (
    <View
      className="mt-4 rounded-3xl px-4 py-3"
      style={{ backgroundColor: theme.legendBackground }}
    >
      {[
        {
          key: "period",
          label: "Period",
          color: theme.periodFill,
          border: "transparent",
        },
        {
          key: "fertile",
          label: "Fertile",
          color: theme.fertileFill,
          border: "transparent",
        },
        {
          key: "ovulation",
          label: "Ovulation",
          color: theme.ovulationFill,
          border: theme.ovulationBorder,
        },
      ].map((item, index) => (
        <Animated.View
          key={item.key}
          entering={FadeInUp.delay(index * 50).duration(220)}
          className="mb-2 flex-row items-center"
        >
          <View
            className="mr-3 h-3 w-3 rounded-full"
            style={{
              backgroundColor: item.color,
              borderWidth: item.border === "transparent" ? 0 : 1.5,
              borderColor: item.border,
            }}
          />
          <Typography className="text-sm text-somaCharcoal dark:text-darkTextPrimary">
            {item.label}
          </Typography>
        </Animated.View>
      ))}
      <Animated.View
        entering={FadeInUp.delay(150).duration(220)}
        className="flex-row items-center"
      >
        <View
          className="mr-3 h-3 w-3 rounded-full"
          style={{
            borderWidth: 1,
            borderColor: theme.predictedPeriodBorder,
            backgroundColor: theme.predictedPeriodFill,
            opacity: 0.55,
          }}
        />
        <Typography className="text-sm text-somaCharcoal dark:text-darkTextPrimary">
          Predicted
        </Typography>
      </Animated.View>
    </View>
  );
}
