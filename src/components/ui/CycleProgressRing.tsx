import { useColorScheme, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';

import { Typography } from '@/src/components/ui/Typography';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type CycleProgressRingProps = {
  progress: number;
  day: number;
  phaseLabel: string;
};

const SIZE = 250;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CycleProgressRing({ progress, day, phaseLabel }: CycleProgressRingProps) {
  const animatedProgress = useSharedValue(0);
  const isDark = useColorScheme() === 'dark';

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [animatedProgress, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - animatedProgress.value),
  }));

  return (
    <View className="items-center justify-center">
      <View className="h-[250px] w-[250px] items-center justify-center rounded-full bg-somaGlow/40 dark:bg-darkCard">
        <Svg width={SIZE} height={SIZE}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={isDark ? '#2A3C57' : '#F3E9E2'}
            strokeWidth={STROKE}
            fill="transparent"
          />
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={isDark ? '#D5B6BD' : '#DDA7A5'}
            strokeWidth={STROKE}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            animatedProps={animatedProps}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
      </View>

      <View className="absolute items-center">
        <Typography className="text-6xl font-semibold text-textPrimary dark:text-darkTextPrimary">{day}</Typography>
        <Typography variant="helper" className="mt-2 uppercase tracking-[2px] text-somaMauve dark:text-darkSecondary">
          Day
        </Typography>
        <Typography className="mt-1 text-base text-textPrimary dark:text-darkTextPrimary">{phaseLabel}</Typography>
      </View>
    </View>
  );
}
