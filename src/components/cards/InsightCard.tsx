import { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Typography } from '@/src/components/ui/Typography';

type InsightCardProps = {
  title?: string;
  body: string;
  icon?: ReactNode;
  delay?: number;
};

export function InsightCard({ title, body, icon, delay = 0 }: InsightCardProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(450)}
      className="mt-4 rounded-[28px] border border-white/70 bg-somaGlow/70 p-5 shadow-soft dark:border-darkBorder dark:bg-darkCard">
      <View className="flex-row gap-4">
        {icon ? (
          <View className="h-11 w-11 items-center justify-center rounded-full border border-somaBlush/30 bg-somaBlush/20 dark:border-darkSecondary/30 dark:bg-darkSecondary/20">
            {icon}
          </View>
        ) : null}
        <View className="flex-1">
          {title ? (
            <Typography className="mb-1 text-lg font-semibold text-textPrimary dark:text-darkTextPrimary">{title}</Typography>
          ) : null}
          <Typography className="text-[15px] leading-6 text-textPrimary dark:text-darkTextSecondary">{body}</Typography>
        </View>
      </View>
    </Animated.View>
  );
}
