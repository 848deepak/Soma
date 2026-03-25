import { supabase } from "@/lib/supabase";

export type ParentalConsentStatus = "pending" | "verified" | "expired" | "revoked";

export type ParentalConsentRecord = {
  id: string;
  child_id: string;
  parent_email: string;
  status: ParentalConsentStatus;
  requested_at: string;
  expires_at: string;
  verified_at: string | null;
  revoked_at: string | null;
};

export async function requestParentalConsent(
  _childId: string,
  parentEmail: string,
  childDateOfBirth?: string,
): Promise<{ requestId: string; expiresAt: string; deduped: boolean; emailSent: boolean }> {
  const normalizedParentEmail = parentEmail.trim().toLowerCase();

  const { data, error } = await supabase.functions.invoke("request-parental-consent", {
    body: {
      parentEmail: normalizedParentEmail,
      childDateOfBirth: childDateOfBirth ?? null,
    },
  });

  if (error || !data?.requestId || !data?.expiresAt) {
    throw new Error(error?.message || "Could not create parental consent request.");
  }

  return {
    requestId: String(data.requestId),
    expiresAt: String(data.expiresAt),
    deduped: Boolean(data.deduped),
    emailSent: Boolean(data.emailSent),
  };
}

export async function verifyParentalConsent(token: string): Promise<{ verified: boolean }> {
  const { data, error } = await supabase.functions.invoke("verify-parental-consent", {
    body: { token },
  });

  if (error) {
    throw new Error(error.message || "Could not verify parental consent.");
  }

  if (!data?.verified) {
    throw new Error("Consent verification failed.");
  }

  return { verified: true };
}

export async function getLatestParentalConsent(
  childId: string,
): Promise<ParentalConsentRecord | null> {
  const { data, error } = await supabase
    .from("parental_consents")
    .select(
      "id, child_id, parent_email, status, requested_at, expires_at, verified_at, revoked_at",
    )
    .eq("child_id", childId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Could not load parental consent status.");
  }

  return (data as ParentalConsentRecord | null) ?? null;
}
