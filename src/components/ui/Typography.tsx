import { ReactNode } from 'react';
import { Text, TextStyle } from 'react-native';

type TypographyVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'muted'
  | 'helper'
  | 'serif'     // Playfair Display SemiBold — large headings (40px)
  | 'serifMd'   // Playfair Display SemiBold — medium headings (32px)
  | 'serifSm';  // Playfair Display SemiBold — small section labels (18px)

type TypographyProps = {
  children: ReactNode;
  variant?: TypographyVariant;
  className?: string;
  style?: TextStyle;
};

const variantStyles: Record<TypographyVariant, string> = {
  // Serif / Playfair Display variants
  serif:    'font-[PlayfairDisplay-SemiBold] text-[40px] leading-tight text-somaCharcoal dark:text-darkTextPrimary',
  serifMd:  'font-[PlayfairDisplay-SemiBold] text-[32px] leading-tight text-somaCharcoal dark:text-darkTextPrimary',
  serifSm:  'font-[PlayfairDisplay-SemiBold] text-[18px] leading-snug text-somaCharcoal dark:text-darkTextPrimary',
  // Sans-serif system-font variants
  h1:   'text-3xl font-semibold text-somaCharcoal dark:text-darkTextPrimary',
  h2:   'text-xl font-semibold text-somaCharcoal dark:text-darkTextPrimary',
  h3:   'text-lg font-semibold text-somaCharcoal dark:text-darkTextPrimary',
  body: 'text-base text-somaCharcoal dark:text-darkTextPrimary',
  muted:  'text-sm text-somaMauve dark:text-darkTextSecondary',
  helper: 'text-xs text-somaMauve dark:text-darkTextSecondary',
};

export function Typography({ children, variant = 'body', className = '', style }: TypographyProps) {
  return (
    <Text className={`${variantStyles[variant]} ${className}`} style={style}>
      {children}
    </Text>
  );
}
