import { useRouter } from "expo-router";
import { View } from "react-native";

import { PressableScale } from "@/src/components/ui/PressableScale";
import { Screen } from "@/src/components/ui/Screen";
import { Typography } from "@/src/components/ui/Typography";

const sections = [
  {
    title: "Our commitment",
    content:
      "Soma is built on a simple principle: your health data belongs to you. We do not sell your personal information.",
  },
  {
    title: "Data we process",
    content:
      "Soma processes cycle dates, daily logs (flow, mood, energy, symptoms, notes, hydration, sleep), profile settings, device metadata, and partner-sharing preferences to provide tracking, reminders, and insights.",
  },
  {
    title: "How health data is used",
    content:
      "We use your data to calculate cycle phases, estimate upcoming periods and fertile windows, power charts/history, and deliver reminders. Soma does not provide diagnosis or treatment, and does not use your health notes to train third-party AI models.",
  },
  {
    title: "Legal basis and consent",
    content:
      "Core processing is required to provide the service you request. Optional analytics and optional partner-sharing controls are consent-based and can be changed in Data Consent Center.",
  },
  {
    title: "Security and storage",
    content:
      "Data is transmitted over HTTPS. Sensitive records are encrypted at rest and access is restricted by authentication and row-level security policies. Audit logs are maintained for sensitive data actions.",
  },
  {
    title: "Vendors and subprocessors",
    content:
      "Soma uses Supabase for backend infrastructure. If configured, Soma uses PostHog for product analytics and Sentry for crash/error monitoring. We configure these services to reduce sensitive payload capture.",
  },
  {
    title: "Analytics and telemetry",
    content:
      "Optional analytics may include app events such as screen views, reliability events, and feature interactions. We do not intentionally send full health-note text in telemetry. You can disable optional analytics in Data Consent Center.",
  },
  {
    title: "Retention",
    content:
      "Account data is retained until you delete it. Telemetry and operational logs are retained only as long as needed for reliability, legal, and security obligations, then removed or anonymized.",
  },
  {
    title: "Partner sharing",
    content:
      "Partner Sync is optional. You control access and can revoke it at any time.",
  },
  {
    title: "Your rights",
    content:
      "You can request access/export, correction, and deletion from Settings. Data deletion is irreversible. You may also submit formal Data Rights Requests and track processing status.",
  },
  {
    title: "International privacy rights",
    content:
      "Depending on your region, you may have rights under GDPR or similar laws, including access, portability, deletion, objection, and complaint rights with your local authority.",
  },
  {
    title: "Children and age limits",
    content:
      "Soma is not directed to children under 13 without parental consent where required by law.",
  },
  {
    title: "Medical disclaimer",
    content:
      "Soma is a wellness tracking product and not a medical device. Content in the app is not medical advice and should not replace professional care.",
  },
  {
    title: "Contact",
    content: "For privacy requests, contact privacy@soma-app.com.",
  },
];

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View style={{ marginTop: 8, marginBottom: 8 }}>
        <Typography variant="serifSm">Privacy Policy</Typography>
        <Typography variant="helper" style={{ marginTop: 6 }}>
          Last updated: March 2026
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
