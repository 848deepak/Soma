import * as Haptics from 'expo-haptics';
import { Text } from 'react-native';

import { PressableScale } from '@/src/components/ui/PressableScale';

type FloatingActionButtonProps = {
  label?: string;
  onPress: () => void;
};

export function FloatingActionButton({ label = '+', onPress }: FloatingActionButtonProps) {
  return (
    <PressableScale
      accessibilityLabel="Open daily log"
      accessibilityRole="button"
      onPress={async () => {
        await Haptics.selectionAsync();
        onPress();
      }}
      className="absolute bottom-8 right-6 h-16 w-16 items-center justify-center rounded-full bg-somaBlush dark:bg-darkPrimary"
      style={{
        // Figma FAB: dusty rose with peach glow shadow
        shadowColor: '#DDA7A5',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
        elevation: 12,
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: '300',
          color: '#FFFFFF',
          lineHeight: 32,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}
