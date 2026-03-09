/**
 * src/components/buttons/SymptomButton.tsx
 * Symptom pill button with haptic selection feedback.
 */
import * as Haptics from "expo-haptics";
import { Text } from "react-native";

import { PressableScale } from "@/src/components/ui/PressableScale";

type SymptomButtonProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
};

export function SymptomButton({
  label,
  selected = false,
  onPress,
}: SymptomButtonProps) {
  function handlePress() {
    // Tactile feedback on every selection/deselection
    Haptics.selectionAsync().catch(() => {
      // Haptics are not available on simulators or web — silent fallback
    });
    onPress();
  }

  return (
    <PressableScale
      onPress={handlePress}
      className={`mb-2 mr-2 rounded-full border px-4 py-2 ${
        selected
          ? "border-somaMauve bg-somaMauve dark:border-darkSecondary dark:bg-darkSecondary/90"
          : "border-somaMauve/30 bg-transparent dark:border-darkBorder"
      }`}
    >
      <Text
        className={`text-[14px] ${
          selected
            ? "text-white dark:text-darkTextPrimary"
            : "text-somaMauve dark:text-darkTextSecondary"
        }`}
      >
        {label}
      </Text>
    </PressableScale>
  );
}
