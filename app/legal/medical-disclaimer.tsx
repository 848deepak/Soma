import { useRouter } from "expo-router";
import { View } from "react-native";

import { PressableScale } from "@/src/components/ui/PressableScale";
import { Screen } from "@/src/components/ui/Screen";
import { Typography } from "@/src/components/ui/Typography";

export default function MedicalDisclaimerScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View
        style={{
          marginTop: 12,
          borderRadius: 18,
          padding: 16,
          borderWidth: 1,
          borderColor: "rgba(221,167,165,0.28)",
          backgroundColor: "rgba(255,255,255,0.75)",
        }}
      >
        <Typography variant="serifSm">Medical Disclaimer</Typography>

        <Typography variant="muted" style={{ marginTop: 10, lineHeight: 22 }}>
          Soma is an informational wellness application and does not provide
          medical advice, diagnosis, or treatment.
        </Typography>

        <Typography variant="muted" style={{ marginTop: 10, lineHeight: 22 }}>
          Do not use Soma for emergency or urgent medical decisions. Always
          consult a qualified healthcare professional for personal medical care.
        </Typography>

        <Typography variant="helper" style={{ marginTop: 10 }}>
          Last updated: March 2026
        </Typography>
      </View>

      <PressableScale
        onPress={() => router.back()}
        style={{
          marginTop: 16,
          borderRadius: 999,
          alignItems: "center",
          paddingVertical: 14,
          backgroundColor: "#DDA7A5",
        }}
      >
        <Typography style={{ color: "#FFFFFF", fontWeight: "600" }}>
          I Understand
        </Typography>
      </PressableScale>
    </Screen>
  );
}
