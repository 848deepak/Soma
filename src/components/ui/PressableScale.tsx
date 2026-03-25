import { ReactNode } from 'react';
import { GestureResponderEvent, Pressable, PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { HapticsService } from '@/src/services/haptics/HapticsService';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableScaleProps = PressableProps & {
  children: ReactNode;
  hapticOnPress?: 'none' | 'selection' | 'impactLight' | 'impactMedium';
};

export function PressableScale({ children, hapticOnPress = 'none', ...props }: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...props}
      onPress={(event: GestureResponderEvent) => {
        if (hapticOnPress === 'selection') {
          void HapticsService.selection();
        } else if (hapticOnPress === 'impactLight') {
          void HapticsService.impactLight();
        } else if (hapticOnPress === 'impactMedium') {
          void HapticsService.impactMedium();
        }
        props.onPress?.(event);
      }}
      onPressIn={(event: GestureResponderEvent) => {
        scale.value = withTiming(0.97, { duration: 120 });
        props.onPressIn?.(event);
      }}
      onPressOut={(event: GestureResponderEvent) => {
        scale.value = withTiming(1, { duration: 160 });
        props.onPressOut?.(event);
      }}
      style={[props.style, animatedStyle]}>
      {children}
    </AnimatedPressable>
  );
}
