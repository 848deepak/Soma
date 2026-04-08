import { supabase } from "@/lib/supabase";
import type { PhiActionType, PhiResourceType } from "@/src/types/hipaa";
import { logWarn } from "@/platform/monitoring/logger";

type AuditMetadata = Record<string, unknown>;

export async function logDataAccess(
  resourceType: PhiResourceType,
  action: PhiActionType,
  metadata: AuditMetadata = {},
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      resource_type: resourceType,
      action,
      metadata,
    });
  } catch (error) {
    logWarn('audit', 'audit_log_write_failed', {
      resourceType,
      action,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
