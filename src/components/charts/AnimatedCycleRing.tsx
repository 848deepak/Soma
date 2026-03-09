import { View } from 'react-native';
import { useColorScheme } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';

import { Typography } from '@/src/components/ui/Typography';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type AnimatedCycleRingProps = {
  progress: number;
  day: number;
  phaseLabel: string;
};

const SIZE = 220;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function AnimatedCycleRing({ progress, day, phaseLabel }: AnimatedCycleRingProps) {
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
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={isDark ? '#2A3C57' : '#E7E2D8'}
          strokeWidth={STROKE}
          fill="transparent"
        />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={isDark ? '#8EB79A' : '#89A88E'}
          strokeWidth={STROKE}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>

      <View className="absolute items-center gap-1">
        <Typography variant="h1">Day {day}</Typography>
        <Typography variant="muted" className="font-medium">
          {phaseLabel}
        </Typography>
      </View>
    </View>
  );
}
