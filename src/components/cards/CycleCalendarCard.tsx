import { View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { PressableScale } from '@/src/components/ui/PressableScale';
import { Typography } from '@/src/components/ui/Typography';
import { MonthCalendarMeta } from '@/src/features/cycle/uiCycleData';

type CycleCalendarCardProps = {
  weekdays: string[];
  weeks: (number | null)[][];
  meta: MonthCalendarMeta;
  selectedDay?: number | null;
  onSelectDay?: (day: number) => void;
};

export function CycleCalendarCard({ weekdays, weeks, meta, selectedDay, onSelectDay }: CycleCalendarCardProps) {
  return (
    <Animated.View
      entering={FadeInUp.duration(450)}
      className="mt-5 rounded-[28px] border border-white/70 bg-surface/80 p-5 shadow-soft dark:border-darkBorder dark:bg-darkSurface">
      <View className="mb-3 flex-row">
        {weekdays.map((day, index) => (
          <View key={`${day}-${index}`} className="flex-1 items-center py-2">
            <Typography variant="helper" className="text-somaMauve dark:text-darkTextSecondary">
              {day}
            </Typography>
          </View>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={`week-${weekIndex}`} className="mb-1 flex-row">
          {week.map((day, dayIndex) => {
            if (!day) {
              return <View key={`empty-${weekIndex}-${dayIndex}`} className="h-11 flex-1" />;
            }

            const isPeriod = meta.periodDays.includes(day);
            const isPredictedPeriod = meta.predictedPeriodDays.includes(day);
            const isFertile = meta.fertileWindow.includes(day);
            const isOvulation = day === meta.ovulationDay;
            const isToday = day === meta.currentDay;
            const isSelected = selectedDay === day;

            return (
              <View key={`day-${weekIndex}-${day}`} className="h-11 flex-1 items-center justify-center">
                <PressableScale
                  onPress={() => onSelectDay?.(day)}
                  hapticOnPress="selection"
                  className={`h-9 w-9 items-center justify-center rounded-full ${
                    isSelected
                      ? 'border border-somaMauve bg-somaMauve/20 dark:border-darkSecondary dark:bg-darkSecondary/30'
                      : isPeriod
                        ? 'bg-somaBlush/85 dark:bg-darkSecondary'
                        : isPredictedPeriod
                          ? 'border border-somaBlush/40 bg-somaBlush/25 dark:border-darkSecondary/60 dark:bg-darkSecondary/40'
                        : isOvulation
                          ? 'border-2 border-somaPeach bg-somaPeach/70 dark:border-darkAccent dark:bg-darkSecondary/80'
                          : isFertile
                            ? 'bg-somaPeach/60 dark:bg-darkSecondary/50'
                            : 'bg-transparent'
                  }`}>
                  <Typography
                    className={`text-[14px] ${
                      isPeriod || isFertile || isOvulation
                        ? 'font-semibold text-white'
                        : isPredictedPeriod
                          ? 'font-semibold text-somaMauve dark:text-darkTextPrimary'
                        : isToday
                          ? 'font-semibold text-somaMauve dark:text-darkAccent'
                          : 'text-textPrimary dark:text-darkTextPrimary'
                    }`}>
                    {day}
                  </Typography>
                </PressableScale>
                {isToday ? <View className="mt-1 h-[2px] w-5 rounded-full bg-somaBlush dark:bg-darkSecondary" /> : null}
              </View>
            );
          })}
        </View>
      ))}

      <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-somaGlow/60 px-4 py-3 dark:bg-darkCard">
        <View className="flex-row items-center gap-2">
          <View className="h-3 w-3 rounded-full bg-somaBlush dark:bg-darkSecondary" />
          <Typography variant="helper">Logged</Typography>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="h-3 w-3 rounded-full border border-somaBlush/50 bg-somaBlush/30 dark:border-darkSecondary/60 dark:bg-darkSecondary/40" />
          <Typography variant="helper">Predicted</Typography>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="h-3 w-3 rounded-full bg-somaPeach dark:bg-darkSecondary/50" />
          <Typography variant="helper">Fertile</Typography>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="h-3 w-3 rounded-full border border-somaPeach dark:border-darkAccent" />
          <Typography variant="helper">Ovulation</Typography>
        </View>
      </View>
    </Animated.View>
  );
}
