import { ReactNode } from 'react';
import { View } from 'react-native';

type CardVariant = 'glass' | 'solid' | 'highlight';

type CardProps = {
  children: ReactNode;
  className?: string;
  variant?: CardVariant;
};

const variantClasses: Record<CardVariant, string> = {
  // Glassmorphic — Figma standard card style with white border + peach tint
  glass:
    'rounded-[28px] border border-white/60 bg-somaPeach/20 dark:border-darkBorder dark:bg-darkCard/80',
  // Solid white card
  solid:
    'rounded-[28px] border border-white/60 bg-white dark:border-darkBorder dark:bg-darkCard',
  // Highlighted callout card — slightly more opaque rose tint
  highlight:
    'rounded-[28px] border border-white/70 bg-somaBlush/25 dark:border-darkBorder dark:bg-darkPrimary/20',
};

export function Card({ children, className = '', variant = 'glass' }: CardProps) {
  return (
    <View
      className={`${variantClasses[variant]} p-5 ${className}`}
      style={{
        shadowColor: '#DDA7A5',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 32,
        elevation: 6,
      }}
    >
      {children}
    </View>
  );
}
