import PostHog from "posthog-react-native";

type PostHogStatic = {
  getFeatureFlag?: (key: string) => Promise<unknown> | unknown;
};

const posthog = PostHog as unknown as PostHogStatic;

const DEFAULT_PERIOD_AUTO_END_DAYS = 7;
const MIN_PERIOD_AUTO_END_DAYS = 3;
const MAX_PERIOD_AUTO_END_DAYS = 14;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export async function getPeriodAutoEndDays(): Promise<number> {
  try {
    if (typeof posthog.getFeatureFlag !== "function") {
      return DEFAULT_PERIOD_AUTO_END_DAYS;
    }

    const flagValue = await posthog.getFeatureFlag("period_auto_end_days");
    const parsed = coerceNumber(flagValue);

    if (parsed == null) {
      return DEFAULT_PERIOD_AUTO_END_DAYS;
    }

    return clamp(parsed, MIN_PERIOD_AUTO_END_DAYS, MAX_PERIOD_AUTO_END_DAYS);
  } catch {
    return DEFAULT_PERIOD_AUTO_END_DAYS;
  }
}
