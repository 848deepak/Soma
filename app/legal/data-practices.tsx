import { useRouter } from "expo-router";
import { View } from "react-native";

import { PressableScale } from "@/src/components/ui/PressableScale";
import { Screen } from "@/src/components/ui/Screen";
import { Typography } from "@/src/components/ui/Typography";

const sections = [
  {
    title: "What we collect",
    content:
      "Soma may collect cycle dates, daily logs (flow, symptoms, mood, notes), profile preferences, optional partner-sharing settings, device metadata, and security telemetry needed to keep the app stable.",
  },
  {
    title: "Why we collect it",
    content:
      "Data is used to deliver core tracking, cycle predictions, reminders, trend views, and account security. Optional analytics is used to improve reliability and feature quality.",
  },
  {
    title: "Data retention",
    content:
      "Cycle logs, symptoms, and profile settings remain in your account until you delete them or use Delete Account in Settings.",
  },
  {
    title: "Data export",
    content:
      "You can export your data in JSON or CSV from Settings > Account > Export Data.",
  },
  {
    title: "Data deletion",
    content:
      "Delete Account permanently removes cycle history, logs, and linked partner access. This action cannot be undone.",
  },
  {
    title: "Data rights workflow",
    content:
      "For formal privacy requests, use Data Rights Requests in Settings > Legal to submit export or deletion requests and track status.",
  },
  {
    title: "Third-party services",
    content:
      "Soma uses Supabase for secure backend infrastructure. Optional analytics may use PostHog and error monitoring may use Sentry when configured.",
  },
  {
    title: "What we do not do",
    content:
      "Soma does not sell personal data, does not provide medical diagnosis, and does not use your personal notes to train external AI systems.",
  },
  {
    title: "Contact",
    content:
      "For privacy questions or legal requests, contact privacy@soma-app.com.",
  },
];

export default function DataPracticesScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View style={{ marginTop: 8, marginBottom: 8 }}>
        <Typography variant="serifSm">Data Practices</Typography>
        <Typography variant="helper" style={{ marginTop: 6 }}>
          Retention, export, deletion, and integrations summary.
        </Typography>
      </View>

      {sections.map((section) => (
        <View
          key={section.title}
          style={{
            marginTop: 12,
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: "rgba(221,167,165,0.28)",
            backgroundColor: "rgba(255,255,255,0.72)",
          }}
        >
          <Typography variant="serifSm" style={{ fontSize: 17 }}>
            {section.title}
          </Typography>
          <Typography variant="muted" style={{ marginTop: 8, lineHeight: 21 }}>
            {section.content}
          </Typography>
        </View>
      ))}

      <PressableScale
        onPress={() => router.back()}
        style={{
          marginTop: 18,
          marginBottom: 20,
          borderRadius: 999,
          alignItems: "center",
          paddingVertical: 14,
          backgroundColor: "#DDA7A5",
        }}
      >
        <Typography style={{ color: "#FFFFFF", fontWeight: "600" }}>
          Done
        </Typography>
      </PressableScale>
    </Screen>
  );
}
