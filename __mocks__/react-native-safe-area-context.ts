// __mocks__/react-native-safe-area-context.ts
// Minimal mock for react-native-safe-area-context in Jest tests
import React from "react";
import { View } from "react-native";

type EdgeInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export const SafeAreaProvider = ({
  children,
  ...props
}: {
  children?: React.ReactNode;
  [key: string]: unknown;
}) => React.createElement(View, props as object, children);

SafeAreaProvider.displayName = "SafeAreaProvider";

export const SafeAreaView = ({
  children,
  ...props
}: {
  children?: React.ReactNode;
  [key: string]: unknown;
}) => React.createElement(View, props as object, children);

SafeAreaView.displayName = "SafeAreaView";

export const useSafeAreaInsets = (): EdgeInsets => ({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
});

export const useSafeAreaFrame = () => ({ x: 0, y: 0, width: 390, height: 844 });

export const SafeAreaConsumer = ({
  children,
}: {
  children: (insets: EdgeInsets) => React.ReactNode;
}) => children({ top: 0, right: 0, bottom: 0, left: 0 });

export const initialWindowMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

export const SafeAreaInsetsContext = React.createContext<EdgeInsets | null>(
  initialWindowMetrics.insets,
);

export const SafeAreaFrameContext = React.createContext<
  { x: number; y: number; width: number; height: number } | null
>(initialWindowMetrics.frame);

const safeAreaExports = {
  __esModule: true,
  SafeAreaProvider,
  SafeAreaView,
  SafeAreaConsumer,
  useSafeAreaInsets,
  useSafeAreaFrame,
  initialWindowMetrics,
  SafeAreaInsetsContext,
  SafeAreaFrameContext,
};

export default safeAreaExports;

module.exports = safeAreaExports;
