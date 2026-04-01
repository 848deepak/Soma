export type PhiResourceType =
  | "cycle_data"
  | "daily_logs"
  | "partner_data"
  | "care_circle"
  | "consent_data"
  | "gdpr_data_rights";

export type PhiActionType =
  | "view"
  | "update_consent"
  | "export"
  | "request"
  | "cancel"
  | "open_result_link"
  | "delete"
  | "create_connection"
  | "get_connections"
  | "get_shared_data"
  | "update_permissions"
  | "revoke_connection"
  | "accept_connection"
  | "get_pending_connections"
  | "reject_connection";

const SENSITIVE_FIELDS = new Set([
  "start_date",
  "end_date",
  "cycle_length",
  "flow_level",
  "mood",
  "symptoms",
  "notes",
  "partner_alert",
  "date_of_birth",
]);

export function isSensitiveField(fieldName: string): boolean {
  return SENSITIVE_FIELDS.has(fieldName);
}
