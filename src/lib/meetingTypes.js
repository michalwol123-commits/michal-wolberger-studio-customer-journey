// Meeting types as Michal sees them on screen (one list for every meeting screen).
// Client-facing labels (calendar, email, /schedule) live in base44/shared/meetingTypes.ts.
export const MEETING_TYPE_OPTIONS = [
  { value: 'intro', label: 'שיחת טלפון ראשונית' },
  { value: 'qualifying', label: 'אפיון' },
  { value: 'quote_presentation', label: 'היכרות והצגת הצעת מחיר' },
  { value: 'program', label: 'פרוגרמה' },
  { value: 'stage_review', label: 'סקירת שלב' },
  { value: 'floor_plan_approval', label: 'אישור תכנית העמדה' },
  { value: 'design_approval', label: 'אישור עיצוב' },
  { value: 'site_visit', label: 'פגישת פיקוח' },
  { value: 'installation_day', label: 'יום התקנה' },
  { value: 'shopping_day', label: 'יום קניות' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'other', label: 'אחר' },
];

export const MEETING_TYPE_LABELS = Object.fromEntries(MEETING_TYPE_OPTIONS.map(t => [t.value, t.label]));

// A free title that Michal gave the meeting wins over the type label.
export const meetingTypeLabel = (m) => m?.custom_title || MEETING_TYPE_LABELS[m?.type] || m?.type || 'פגישה';
