import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Switch, View, useColorScheme } from "react-native";

import { PressableScale } from "@/src/components/ui/PressableScale";
import { Screen } from "@/src/components/ui/Screen";
import { Typography } from "@/src/components/ui/Typography";
import {
  getConsentSnapshot,
  setAnalyticsConsent,
  setPartnerSharingConsent,
} from "@/src/services/consentService";

type ConsentStatusRowProps = {
  title: string;
  description: string;
  granted: boolean;
  timestamp?: string;
  onPress?: () => void;
  isDark: boolean;
};

function ConsentStatusRow({
  title,
  description,
  granted,
  timestamp,
  onPress,
  isDark,
}: ConsentStatusRowProps) {
  const statusColor = granted ? "#16A34A" : "#B91C1C";
  const statusText = granted ? "Accepted" : "Missing";

  return (
    <PressableScale
      onPress={onPress}
      style={{
        marginTop: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(221,167,165,0.24)",
        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.72)",
        padding: 12,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Typography style={{ fontWeight: "600", fontSize: 15 }}>{title}</Typography>
        <Typography style={{ color: statusColor, fontWeight: "600" }}>{statusText}</Typography>
      </View>
      <Typography variant="muted" style={{ marginTop: 6, lineHeight: 19 }}>
        {description}
      </Typography>
      {timestamp ? (
        <Typography variant="helper" style={{ marginTop: 8 }}>
          {`Accepted on ${new Date(timestamp).toLocaleDateString()}`}
        </Typography>
      ) : null}
    </PressableScale>
  );
}

export default function DataConsentScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";

  const [isSaving, setIsSaving] = useState(false);
  const [analyticsConsent, setAnalyticsConsentState] = useState(false);
  const [partnerSharingConsent, setPartnerSharingConsent] = useState(false);
  const [consentTimestamp, setConsentTimestamp] = useState<
    Partial<Record<"privacy" | "terms" | "medical" | "cycle", string>>
  >({});

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const snapshot = await getConsentSnapshot();
      if (!mounted) return;

      setAnalyticsConsentState(snapshot.analytics?.granted === true);
      setPartnerSharingConsent(snapshot.partner_sharing?.granted === true);
      setConsentTimestamp({
        privacy: snapshot.privacy_policy?.timestamp,
        terms: snapshot.terms_of_use?.timestamp,
        medical: snapshot.medical_disclaimer?.timestamp,
        cycle: snapshot.cycle_data?.timestamp,
      });
    })();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSave() {
    setIsSaving(true);
    try {
      await setAnalyticsConsent(analyticsConsent);
      await setPartnerSharingConsent(partnerSharingConsent);
      Alert.alert("Saved", "Your consent preferences have been updated.");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not update consent preferences.";
      Alert.alert("Update Failed", message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen>
      <View style={{ marginTop: 8 }}>
        <Typography variant="serifSm">Data Consent Center</Typography>
        <Typography variant="helper" style={{ marginTop: 6 }}>
          Review required legal acknowledgements and manage optional consent.
        </Typography>
      </View>

      <View
        style={{
          marginTop: 12,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(221,167,165,0.28)",
          backgroundColor: isDark ? "rgba(30,33,40,0.85)" : "rgba(255,255,255,0.75)",
          padding: 14,
        }}
      >
        <Typography variant="serifSm" style={{ fontSize: 18 }}>
          Required for core app use
        </Typography>

        <ConsentStatusRow
          title="Privacy Policy"
          description="Explains data handling, security, and user rights."
          granted={Boolean(consentTimestamp.privacy)}
          timestamp={consentTimestamp.privacy}
          onPress={() => router.push("/legal/privacy" as never)}
          isDark={isDark}
        />
        <ConsentStatusRow
          title="Terms of Use"
          description="Defines acceptable use and account responsibilities."
          granted={Boolean(consentTimestamp.terms)}
          timestamp={consentTimestamp.terms}
          onPress={() => router.push("/legal/terms" as never)}
          isDark={isDark}
        />
        <ConsentStatusRow
          title="Medical Disclaimer"
          description="Soma is a wellness app and not medical advice."
          granted={Boolean(consentTimestamp.medical)}
          timestamp={consentTimestamp.medical}
          onPress={() => router.push("/legal/medical-disclaimer" as never)}
          isDark={isDark}
        />
        <ConsentStatusRow
          title="Cycle Data Processing"
          description="Required to process cycle and symptom logs for predictions."
          granted={Boolean(consentTimestamp.cycle)}
          timestamp={consentTimestamp.cycle}
          isDark={isDark}
        />
      </View>

      <View
        style={{
          marginTop: 14,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(221,167,165,0.28)",
          backgroundColor: isDark ? "rgba(30,33,40,0.85)" : "rgba(255,255,255,0.75)",
          padding: 14,
        }}
      >
        <Typography variant="serifSm" style={{ fontSize: 18 }}>
          Optional consent
        </Typography>

        <View
          style={{
            marginTop: 12,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,218,185,0.18)",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Typography style={{ fontWeight: "600" }}>Analytics</Typography>
            <Typography variant="helper" style={{ marginTop: 4, lineHeight: 18 }}>
              Helps us improve reliability and product quality. Never required.
            </Typography>
          </View>
          <Switch
            value={analyticsConsent}
            onValueChange={setAnalyticsConsentState}
            trackColor={{ false: "#D7CFCA", true: "#DDA7A5" }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View
          style={{
            marginTop: 10,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,218,185,0.18)",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Typography style={{ fontWeight: "600" }}>Partner data sharing</Typography>
            <Typography variant="helper" style={{ marginTop: 4, lineHeight: 18 }}>
              Allows sharing selected cycle insights with an invited partner.
            </Typography>
          </View>
          <Switch
            value={partnerSharingConsent}
            onValueChange={setPartnerSharingConsent}
            trackColor={{ false: "#D7CFCA", true: "#DDA7A5" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <PressableScale
        onPress={handleSave}
        style={{
          marginTop: 16,
          borderRadius: 999,
          alignItems: "center",
          paddingVertical: 14,
          backgroundColor: "#DDA7A5",
          opacity: isSaving ? 0.7 : 1,
        }}
        disabled={isSaving}
      >
        <Typography style={{ color: "#FFFFFF", fontWeight: "600" }}>
          {isSaving ? "Saving..." : "Save Consent Preferences"}
        </Typography>
      </PressableScale>

      <PressableScale
        onPress={() => router.back()}
        style={{
          marginTop: 10,
          marginBottom: 20,
          borderRadius: 999,
          alignItems: "center",
          paddingVertical: 13,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(221,167,165,0.35)",
        }}
      >
        <Typography style={{ fontWeight: "600", color: isDark ? "#F2F2F2" : "#2D2327" }}>
          Back
        </Typography>
      </PressableScale>
    </Screen>
  );
}
