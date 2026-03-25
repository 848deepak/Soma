export type PhiResourceType =
  | "cycle_data"
  | "daily_logs"
  | "partner_data"
  | "consent_data"
  | "gdpr_data_rights";

export type PhiActionType =
  | "view"
  | "export"
  | "request"
  | "cancel"
  | "open_result_link"
  | "delete";

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
