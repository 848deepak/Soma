import { ReactNode } from 'react';
import { GestureResponderEvent, Pressable, PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableScaleProps = PressableProps & {
  children: ReactNode;
};

export function PressableScale({ children, ...props }: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...props}
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
