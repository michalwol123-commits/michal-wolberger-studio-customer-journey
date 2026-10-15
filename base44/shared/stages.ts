// Project stage names for backend functions (client messages, agent replies).
// Mirror of src/lib/stageConfig.js — scripts/check-stages.sh in the backup repo checks they stay identical.
export const STAGE_NAMES: Record<number, string> = {
  1: 'יצירת קשר ראשוני',
  2: 'שיחת היכרות',
  3: 'פגישת הצעת מחיר',
  4: 'סגירת פרויקט',
  5: 'שאלון מפורט',
  6: 'תכנית העמדה',
  7: 'הכנה לביצוע',
  8: 'קונספט עיצובי + רנדרים',
  9: 'ימי קניות',
  10: 'תמחור קבלנים/ספקים',
  11: 'ביצוע בשטח + ימי פיקוח',
  12: 'ימי התקנה ותיאום ספקים',
  13: 'סיום פרויקט ומסירה',
};

export const TOTAL_STAGES = 13;

export const stageName = (n: number) => STAGE_NAMES[n] || `שלב ${n}`;

// The WhatsApp the client gets when the project moves forward (autoStageAdvance; previewed by setProjectStage).
export const stageUpdateMessage = (clientName: string, n: number) =>
  `שלום ${clientName}! עדכון מהפרויקט: עברנו לשלב ${n} — ${stageName(n)}. נעדכן אתכם בהמשך 💛`;
