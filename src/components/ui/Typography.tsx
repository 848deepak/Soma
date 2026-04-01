import { ReactNode } from "react";
import { Text, TextStyle } from "react-native";

import { useAppTheme } from "@/src/context/ThemeContext";

type TypographyVariant =
  | "h1"
  | "h2"
  | "h3"
  | "body"
  | "muted"
  | "helper"
  | "serif" // Playfair Display SemiBold — large headings (40px)
  | "serifMd" // Playfair Display SemiBold — medium headings (32px)
  | "serifSm"; // Playfair Display SemiBold — small section labels (18px)

type TypographyProps = {
  children: ReactNode;
  variant?: TypographyVariant;
  className?: string;
  style?: TextStyle;
};

const variantStyles: Record<TypographyVariant, string> = {
  // Serif / Playfair Display variants
  serif: "font-[PlayfairDisplay-SemiBold] text-[40px] leading-tight",
  serifMd: "font-[PlayfairDisplay-SemiBold] text-[32px] leading-tight",
  serifSm: "font-[PlayfairDisplay-SemiBold] text-[18px] leading-snug",
  // Sans-serif system-font variants
  h1: "text-3xl font-semibold",
  h2: "text-xl font-semibold",
  h3: "text-lg font-semibold",
  body: "text-base",
  muted: "text-sm",
  helper: "text-xs",
};

const secondaryVariants: TypographyVariant[] = ["muted", "helper"];

export function Typography({
  children,
  variant = "body",
  className = "",
  style,
}: TypographyProps) {
  const { colors } = useAppTheme();
  const defaultColor = secondaryVariants.includes(variant)
    ? colors.textSecondary
    : colors.textPrimary;

  return (
    <Text
      className={`${variantStyles[variant]} ${className}`}
      style={[{ color: defaultColor }, style]}
    >
      {children}
    </Text>
  );
}
