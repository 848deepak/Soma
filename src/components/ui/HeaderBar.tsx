import { ReactNode } from 'react';
import { View } from 'react-native';

import { Typography } from '@/src/components/ui/Typography';

type HeaderBarProps = {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
};

export function HeaderBar({ title, subtitle, rightSlot }: HeaderBarProps) {
  return (
    <View className="mt-4 flex-row items-start justify-between">
      <View className="flex-1 pr-3">
        {/* Playfair Display 32px heading matching Figma "Good Morning, Alex" */}
        <Typography variant="serifMd">{title}</Typography>
        {subtitle ? (
          <Typography variant="muted" className="mt-2">
            {subtitle}
          </Typography>
        ) : null}
      </View>
      {rightSlot ? <View>{rightSlot}</View> : null}
    </View>
  );
}
