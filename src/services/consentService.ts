import AsyncStorage from "@react-native-async-storage/async-storage";

type ConsentType =
  | "privacy_policy"
  | "terms_of_use"
  | "medical_disclaimer"
  | "cycle_data"
  | "analytics"
  | "partner_sharing";

type ConsentRecord = {
  granted: boolean;
  timestamp: string;
  version: string;
};

type ConsentSnapshot = Partial<Record<ConsentType, ConsentRecord>>;

const CONSENTS_STORAGE_KEY = "@soma_consents_v1";
const POLICY_VERSION = "2026-03";

const REQUIRED_AUTH_CONSENTS: ConsentType[] = [
  "privacy_policy",
  "terms_of_use",
  "medical_disclaimer",
  "cycle_data",
];

async function readSnapshot(): Promise<ConsentSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(CONSENTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ConsentSnapshot;
    return parsed ?? {};
  } catch {
    return {};
  }
}

async function writeSnapshot(snapshot: ConsentSnapshot): Promise<void> {
  await AsyncStorage.setItem(CONSENTS_STORAGE_KEY, JSON.stringify(snapshot));
}

export async function setConsent(
  type: ConsentType,
  granted: boolean,
  version = POLICY_VERSION,
): Promise<void> {
  const snapshot = await readSnapshot();
  snapshot[type] = {
    granted,
    timestamp: new Date().toISOString(),
    version,
  };
  await writeSnapshot(snapshot);
}

export async function getConsentSnapshot(): Promise<ConsentSnapshot> {
  return readSnapshot();
}

export async function hasRequiredAuthConsent(): Promise<boolean> {
  const snapshot = await readSnapshot();
  return REQUIRED_AUTH_CONSENTS.every(
    (type) => snapshot[type]?.granted === true,
  );
}

export async function recordRequiredAuthConsent(
  version = POLICY_VERSION,
): Promise<void> {
  const now = new Date().toISOString();
  const snapshot = await readSnapshot();
  for (const type of REQUIRED_AUTH_CONSENTS) {
    snapshot[type] = {
      granted: true,
      timestamp: now,
      version,
    };
  }
  await writeSnapshot(snapshot);
}

export async function setAnalyticsConsent(granted: boolean): Promise<void> {
  await setConsent("analytics", granted);
}

export async function setPartnerSharingConsent(
  granted: boolean,
): Promise<void> {
  await setConsent("partner_sharing", granted);
}
