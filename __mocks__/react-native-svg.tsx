// __mocks__/react-native-svg.tsx
import React from 'react';
import { View } from 'react-native';

const Svg = ({ children, ...props }: Record<string, unknown>) =>
  React.createElement(View, props as object, children as React.ReactNode);

const Circle = (props: Record<string, unknown>) => React.createElement(View, props as object);
const Rect = (props: Record<string, unknown>) => React.createElement(View, props as object);
const Line = (props: Record<string, unknown>) => React.createElement(View, props as object);
const Path = (props: Record<string, unknown>) => React.createElement(View, props as object);
const G = ({ children, ...props }: Record<string, unknown>) =>
  React.createElement(View, props as object, children as React.ReactNode);
const Text = ({ children, ...props }: Record<string, unknown>) =>
  React.createElement(View, props as object, children as React.ReactNode);
const TSpan = ({ children, ...props }: Record<string, unknown>) =>
  React.createElement(View, props as object, children as React.ReactNode);
const Defs = ({ children, ...props }: Record<string, unknown>) =>
  React.createElement(View, props as object, children as React.ReactNode);
const LinearGradient = ({ children, ...props }: Record<string, unknown>) =>
  React.createElement(View, props as object, children as React.ReactNode);
const Stop = (props: Record<string, unknown>) => React.createElement(View, props as object);

export default Svg;
export { Circle, Rect, Line, Path, G, Text, TSpan, Defs, LinearGradient, Stop };
