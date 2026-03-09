// __mocks__/react-native-safe-area-context.ts
// Minimal mock for react-native-safe-area-context in Jest tests
import React from "react";
import { View } from "react-native";

const SafeAreaProvider = ({
  children,
  ...props
}: {
  children?: React.ReactNode;
  [key: string]: unknown;
}) => React.createElement(View, props as object, children);

const SafeAreaView = ({
  children,
  ...props
}: {
  children?: React.ReactNode;
  [key: string]: unknown;
}) => React.createElement(View, props as object, children);

const useSafeAreaInsets = () => ({ top: 0, right: 0, bottom: 0, left: 0 });

const useSafeAreaFrame = () => ({ x: 0, y: 0, width: 390, height: 844 });

const SafeAreaConsumer = ({
  children,
}: {
  children: (insets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  }) => React.ReactNode;
}) => children({ top: 0, right: 0, bottom: 0, left: 0 });

const initialWindowMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

module.exports = {
  SafeAreaProvider,
  SafeAreaView,
  SafeAreaConsumer,
  useSafeAreaInsets,
  useSafeAreaFrame,
  initialWindowMetrics,
};
