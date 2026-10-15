// Meeting type labels as clients see them (calendar, email, WhatsApp, /schedule).
// The screen's labels for Michal live in src/lib/meetingTypes.js.
export const MEETING_TYPE_LABELS: Record<string, string> = {
  intro: 'שיחת טלפון ראשונית',
  qualifying: 'פגישת סינון',
  quote_presentation: 'היכרות והצגת הצעת מחיר',
  program: 'פגישת פרוגרמה',
  stage_review: 'סקירת שלב',
  floor_plan_approval: 'אישור תכנית העמדה',
  design_approval: 'אישור עיצוב',
  site_visit: 'ביקור באתר',
  installation_day: 'יום התקנה',
  shopping_day: 'יום קניות',
  zoom: 'פגישת זום',
  other: 'פגישה',
};

// A free title that Michal gave the meeting wins over the type label.
export function meetingLabel(m: { type?: string; custom_title?: string } | null | undefined): string {
  if (m?.custom_title) return m.custom_title;
  return MEETING_TYPE_LABELS[m?.type || ''] || 'פגישה';
}
