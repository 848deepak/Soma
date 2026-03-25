export type NotificationTemplateType =
  | 'period_alert'
  | 'ovulation_alert'
  | 'daily_log'
  | 'behavioral_inactive'
  | 'behavioral_cycle_phase';

export type TemplateContext = {
  firstName?: string | null;
  cyclePhase?: 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | null;
  inactiveDays?: number;
};

export function buildNotificationTemplate(
  type: NotificationTemplateType,
  ctx: TemplateContext,
): { title: string; body: string } {
  const name = ctx.firstName?.trim() || 'there';

  switch (type) {
    case 'period_alert':
      return {
        title: `Hi ${name}, your period may start tomorrow`,
        body: 'Take a moment to prepare supplies and plan a lighter day if needed.',
      };
    case 'ovulation_alert':
      return {
        title: `Ovulation window is open, ${name}`,
        body: 'Your fertile window has likely started. Log symptoms for better predictions.',
      };
    case 'daily_log':
      return {
        title: `${name}, log today in 30 seconds`,
        body: 'A quick check-in keeps your predictions accurate and your trends useful.',
      };
    case 'behavioral_inactive':
      return {
        title: `We miss your check-ins, ${name}`,
        body: `You have been inactive for ${ctx.inactiveDays ?? 0} days. Log today to keep your cycle insights fresh.`,
      };
    case 'behavioral_cycle_phase':
      return {
        title: `${name}, your ${ctx.cyclePhase ?? 'current'} phase update`,
        body: 'Open Soma to see context-aware guidance for today.',
      };
    default:
      return {
        title: `Soma reminder for ${name}`,
        body: 'Open Soma for today\'s personalized cycle guidance.',
      };
  }
}
