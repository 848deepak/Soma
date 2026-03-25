import { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';

import { PressableScale } from '@/src/components/ui/PressableScale';
import { Typography } from '@/src/components/ui/Typography';
import { HapticsService } from '@/src/services/haptics/HapticsService';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = {
  title: string;
  onPress: () => void;
  icon?: ReactNode;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
};

const variantClasses: Record<ButtonVariant, string> = {
  // Pill, dusty-rose filled — Figma 56px height primary CTA
  primary:
    'min-h-[56px] flex-row items-center justify-center rounded-full bg-somaBlush px-6 shadow-glow dark:bg-darkPrimary',
  // Outlined pill — secondary action
  secondary:
    'min-h-[56px] flex-row items-center justify-center rounded-full border-2 border-somaBlush bg-transparent px-6 dark:border-darkPrimary',
  // Ghost / text only — tertiary action
  ghost:
    'min-h-[44px] flex-row items-center justify-center px-4',
};

const textClasses: Record<ButtonVariant, string> = {
  primary: 'font-semibold text-white',
  secondary: 'font-semibold text-somaBlush dark:text-darkPrimary',
  ghost: 'font-medium text-somaMauve dark:text-darkTextSecondary',
};

export function Button({
  title,
  onPress,
  icon,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  className = '',
}: ButtonProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      className={`${variantClasses[variant]} ${className}`}
      style={[{ opacity: disabled || loading ? 0.6 : 1 }, style as ViewStyle]}
      onPress={async () => {
        if (disabled || loading) return;
        await HapticsService.selection();
        onPress();
      }}>
      {icon}
      <Typography variant="body" className={textClasses[variant]}>
        {loading ? '…' : title}
      </Typography>
    </PressableScale>
  );
}
