// __mocks__/react-native-reanimated.ts
// Minimal mock for react-native-reanimated in Jest tests
import React from 'react';

const Animated = {
  Value: jest.fn(() => ({})),
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  createAnimatedComponent: jest.fn((component: unknown) => component),
};

// Mock hook implementations
const useSharedValue = jest.fn((initial: unknown) => ({ value: initial }));
const useDerivedValue = jest.fn((fn: () => unknown) => ({ value: fn() }));
const useAnimatedStyle = jest.fn((fn: () => Record<string, unknown>) => fn());
const useAnimatedScrollHandler = jest.fn(() => ({}));
const useAnimatedRef = jest.fn(() => ({ current: null }));
const useAnimatedGestureHandler = jest.fn(() => ({}));
const useAnimatedProps = jest.fn((fn: () => Record<string, unknown>) => fn());
const useAnimatedReaction = jest.fn();
const useWorkletCallback = jest.fn((fn: unknown) => fn);
const useDerivedValue2 = jest.fn();

// Animation functions
const withTiming = jest.fn((toValue: unknown) => toValue);
const withSpring = jest.fn((toValue: unknown) => toValue);
const withDelay = jest.fn((_delay: unknown, animation: unknown) => animation);
const withSequence = jest.fn((...animations: unknown[]) => animations[animations.length - 1]);
const withRepeat = jest.fn((animation: unknown) => animation);
const cancelAnimation = jest.fn();
const runOnJS = jest.fn((fn: (...args: unknown[]) => unknown) => fn);
const runOnUI = jest.fn((fn: (...args: unknown[]) => unknown) => fn);
const interpolate = jest.fn((_value: number, _input: number[], output: number[]) => output[0]);
const Extrapolation = { EXTEND: 'extend', CLAMP: 'clamp', IDENTITY: 'identity' };
const Easing = {
  linear: (t: number) => t,
  ease: (t: number) => t,
  quad: (t: number) => t,
  cubic: (t: number) => t,
  bezier: () => (t: number) => t,
  circle: (t: number) => t,
  sin: (t: number) => t,
  exp: (t: number) => t,
  elastic: () => (t: number) => t,
  back: () => (t: number) => t,
  bounce: (t: number) => t,
  steps: () => (t: number) => t,
  inOut: (easing: (t: number) => number) => easing,
  in: (easing: (t: number) => number) => easing,
  out: (easing: (t: number) => number) => easing,
};

// Animated component proxy
function createAnimatedProxy(Tag: string) {
  return function AnimatedComponent({ children, style, ...props }: { children?: React.ReactNode; style?: unknown; [key: string]: unknown }) {
    return React.createElement(Tag, { style, ...props }, children);
  };
}

// FadeIn/FadeOut/SlideIn/SlideOut animations (used with entering/exiting props)
const createEntryExitAnimation = () => ({
  delay: jest.fn().mockReturnThis(),
  duration: jest.fn().mockReturnThis(),
  springify: jest.fn().mockReturnThis(),
  damping: jest.fn().mockReturnThis(),
  stiffness: jest.fn().mockReturnThis(),
  withInitialValues: jest.fn().mockReturnThis(),
  build: jest.fn(() => ({})),
});

const FadeIn = createEntryExitAnimation();
const FadeOut = createEntryExitAnimation();
const FadeInDown = createEntryExitAnimation();
const FadeInUp = createEntryExitAnimation();
const FadeOutDown = createEntryExitAnimation();
const FadeOutUp = createEntryExitAnimation();
const SlideInLeft = createEntryExitAnimation();
const SlideInRight = createEntryExitAnimation();
const SlideOutLeft = createEntryExitAnimation();
const SlideOutRight = createEntryExitAnimation();
const ZoomIn = createEntryExitAnimation();
const ZoomOut = createEntryExitAnimation();
const BounceIn = createEntryExitAnimation();
const BounceOut = createEntryExitAnimation();
const Layout = createEntryExitAnimation();

// Animated component
const AnimatedView = createAnimatedProxy('View');
const AnimatedText = createAnimatedProxy('Text');
const AnimatedScrollView = createAnimatedProxy('ScrollView');
const AnimatedImage = createAnimatedProxy('Image');
const AnimatedFlatList = createAnimatedProxy('FlatList');

// Default export: Animated namespace
const ReanimatedModule = {
  ...Animated,
  default: {
    View: AnimatedView,
    Text: AnimatedText,
    ScrollView: AnimatedScrollView,
    Image: AnimatedImage,
    FlatList: AnimatedFlatList,
    createAnimatedComponent: (component: unknown) => component,
  },
  View: AnimatedView,
  Text: AnimatedText,
  ScrollView: AnimatedScrollView,
  Image: AnimatedImage,
  FlatList: AnimatedFlatList,
  createAnimatedComponent: (component: unknown) => component,
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  useAnimatedRef,
  useAnimatedGestureHandler,
  useAnimatedProps,
  useAnimatedReaction,
  useWorkletCallback,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  cancelAnimation,
  runOnJS,
  runOnUI,
  interpolate,
  Extrapolation,
  Easing,
  FadeIn,
  FadeOut,
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  FadeOutUp,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
  ZoomIn,
  ZoomOut,
  BounceIn,
  BounceOut,
  Layout,
};

module.exports = ReanimatedModule;
