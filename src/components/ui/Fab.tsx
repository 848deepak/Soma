import * as Haptics from 'expo-haptics';
import { Text } from 'react-native';

import { PressableScale } from '@/src/components/ui/PressableScale';

type FabProps = {
  onPress: () => void;
};

export function Fab({ onPress }: FabProps) {
  return (
    <PressableScale
      accessibilityLabel="Log symptoms"
      accessibilityRole="button"
      className="absolute bottom-8 right-6 h-16 w-16 items-center justify-center rounded-full bg-secondary dark:bg-darkSecondary"
      onPress={async () => {
        await Haptics.selectionAsync();
        onPress();
      }}>
      <Text className="text-3xl font-semibold text-accent dark:text-darkAccent">+</Text>
    </PressableScale>
  );
}
