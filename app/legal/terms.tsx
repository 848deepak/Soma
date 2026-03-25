import { useRouter } from "expo-router";
import { View } from "react-native";

import { PressableScale } from "@/src/components/ui/PressableScale";
import { Screen } from "@/src/components/ui/Screen";
import { Typography } from "@/src/components/ui/Typography";

const sections = [
  {
    title: "Acceptance",
    content:
      "By using Soma, you agree to these Terms of Use. If you do not agree, do not use the service.",
  },
  {
    title: "Medical disclaimer",
    content:
      "Soma is a wellness tool and is not medical advice, diagnosis, or treatment.",
  },
  {
    title: "Eligibility",
    content:
      "You must be at least 13 years old, or use Soma with parental consent where required.",
  },
  {
    title: "Privacy and consent",
    content:
      "Your use of Soma is also governed by our Privacy Policy and your consent preferences. Optional analytics and optional partner sharing can be changed at any time in Data Consent Center.",
  },
  {
    title: "Account and data",
    content:
      "You are responsible for keeping access to your account secure. You can delete your data from Settings.",
  },
  {
    title: "Acceptable use",
    content:
      "Do not misuse Soma, attempt unauthorized access, or use the app for unlawful purposes.",
  },
  {
    title: "Partner sharing",
    content:
      "Partner Sync is optional, read-only for partners, and revocable by you at any time.",
  },
  {
    title: "No medical relationship",
    content:
      "Using Soma does not create a clinician-patient relationship. Predictions and reminders are informational only and may be inaccurate.",
  },
  {
    title: "Service availability",
    content:
      "We may update, suspend, or discontinue features to improve safety, reliability, or legal compliance. We will make reasonable efforts to minimize disruption.",
  },
  {
    title: "Data rights and deletion",
    content:
      "You can export or delete your data in Settings and submit formal data-rights requests in Legal. Completed deletions are irreversible.",
  },
  {
    title: "Contact",
    content: "For support, contact support@soma-app.com.",
  },
];

export default function TermsScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View style={{ marginTop: 8, marginBottom: 8 }}>
        <Typography variant="serifSm">Terms of Use</Typography>
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
