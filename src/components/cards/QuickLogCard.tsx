import { View } from 'react-native';

import { Card } from '@/src/components/ui/Card';
import { PressableScale } from '@/src/components/ui/PressableScale';
import { Typography } from '@/src/components/ui/Typography';
import { ENERGY_OPTIONS, MOOD_OPTIONS } from '@/src/domain/constants/logOptions';

type QuickLogCardProps = {
  selectedMood?: string;
  selectedEnergy?: string;
  onMoodSelect: (value: string) => void;
  onEnergySelect: (value: string) => void;
};

function Pill({
  value,
  active,
  onPress,
}: {
  value: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      className={`mb-2 mr-2 rounded-full border px-4 py-2 ${active ? 'border-primary bg-primary/20 dark:border-darkPrimary dark:bg-darkPrimary/30' : 'border-border bg-surface dark:border-darkBorder dark:bg-darkSurface'}`}
      onPress={onPress}>
      <Typography variant="muted" className={active ? 'text-textPrimary dark:text-darkTextPrimary' : ''}>
        {value}
      </Typography>
    </PressableScale>
  );
}

export function QuickLogCard({ selectedMood, selectedEnergy, onMoodSelect, onEnergySelect }: QuickLogCardProps) {
  return (
    <Card className="mt-6">
      <Typography variant="h2" className="mb-3">
        Today’s Mood & Energy
      </Typography>

      <Typography variant="helper" className="mb-2 uppercase tracking-wide">
        Mood
      </Typography>
      <View className="mb-2 flex-row flex-wrap">
        {MOOD_OPTIONS.map((mood) => (
          <Pill key={mood} value={mood} active={selectedMood === mood} onPress={() => onMoodSelect(mood)} />
        ))}
      </View>

      <Typography variant="helper" className="mb-2 mt-2 uppercase tracking-wide">
        Energy
      </Typography>
      <View className="flex-row flex-wrap">
        {ENERGY_OPTIONS.map((energy) => (
          <Pill key={energy} value={energy} active={selectedEnergy === energy} onPress={() => onEnergySelect(energy)} />
        ))}
      </View>
    </Card>
  );
}
