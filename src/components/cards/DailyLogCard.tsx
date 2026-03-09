import { View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { DailyEntry } from '@/src/features/cycle/uiMockData';
import { Typography } from '@/src/components/ui/Typography';

type DailyLogCardProps = {
  entries: DailyEntry[];
};

export function DailyLogCard({ entries }: DailyLogCardProps) {
  return (
    <Animated.View
      entering={FadeInUp.duration(450)}
      className="mt-4 rounded-[28px] border border-white/70 bg-white/70 p-5 shadow-soft dark:border-darkBorder dark:bg-darkCard">
      <Typography className="mb-4 text-lg font-semibold text-textPrimary dark:text-darkTextPrimary">Daily Log</Typography>
      {entries.map((entry) => (
        <View key={entry.id} className="mb-3 flex-row items-center justify-between rounded-2xl bg-somaGlow/50 px-4 py-3 dark:bg-darkSurface">
          <View className="pr-4">
            <Typography className="text-[15px] font-medium text-textPrimary dark:text-darkTextPrimary">{entry.title}</Typography>
            <Typography variant="helper" className="mt-1 text-somaMauve dark:text-darkTextSecondary">
              {entry.subtitle}
            </Typography>
          </View>
          <View className={`rounded-full px-3 py-1 ${entry.status === 'done' ? 'bg-somaBlush/50 dark:bg-darkSecondary/40' : 'bg-somaPeach/50 dark:bg-darkBorder'}`}>
            <Typography variant="helper" className="font-semibold uppercase tracking-wide text-textPrimary dark:text-darkTextPrimary">
              {entry.status}
            </Typography>
          </View>
        </View>
      ))}
    </Animated.View>
  );
}
