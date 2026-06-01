/**
 * Stage Checklist Configuration (Stages 4-13)
 * Each item has: id, label, type (manual|button|auto), required, action
 * 
 * action types:
 *  - upload_doc: opens UploadDocumentDialog with docType + stage
 *  - navigate_tab: switches to a tab in ProjectDetail
 *  - add_meeting: opens AddMeetingDialog with meetingType
 *  - run_function: invokes a backend function
 *  - auto_check_questionnaire: auto-checked when detailed questionnaire is submitted
 *  - auto_check_payments: auto-checked when all payments are paid
 *  - auto_check_floor_plan: auto-checked when project.floor_plan_locked = true
 */

const STAGE_CHECKLISTS = {
  4: {
    title: 'סגירת פרויקט',
    items: [
      { id: 's4_1', label: 'אישור לקוח — בחירת חבילה', type: 'manual', required: true },
      { id: 's4_2', label: 'העלאת חוזה חתום', type: 'button', required: true, action: { type: 'upload_doc', docType: 'contract', stage: 4 } },
      { id: 's4_3', label: 'תשלום ראשון — מקדמה', type: 'button', required: true, action: { type: 'navigate_tab', tab: 'payments' } },
      { id: 's4_4', label: 'הגדרת פריסת תשלומים עתידית', type: 'button', required: false, action: { type: 'navigate_tab', tab: 'payments' } },
      { id: 's4_5', label: 'הזנת Timeline ראשוני', type: 'button', required: false, action: { type: 'navigate_tab', tab: 'gantt' } },
      { id: 's4_6', label: 'שליחת "ברוכים הבאים" + פרטי גישה לפורטל', type: 'button', required: false, action: { type: 'run_function', functionName: 'autoWelcomeClient' } },
      { id: 's4_7', label: 'תיאום פגישה ראשונה', type: 'auto', required: false, action: { type: 'auto_check_stage_review' } },
    ]
  },
  5: {
    title: 'שאלון מפורט',
    items: [
      { id: 's5_1', label: 'שליחת שאלון מפורט ללקוח', type: 'button', required: true, action: { type: 'navigate_tab', tab: 'questionnaires' } },
      { id: 's5_2', label: 'מילוי השאלון ע"י הלקוח', type: 'auto', required: true, action: { type: 'auto_check_questionnaire' } },
      { id: 's5_3', label: 'סיכום תשובות ב-CRM', type: 'manual', required: false },
      { id: 's5_4', label: 'הכנה לפגישת תכנית', type: 'manual', required: false },
    ]
  },
  6: {
    title: 'תכנית העמדה',
    items: [
      { id: 's6_1', label: 'הכנת תכנית העמדה (עד 3 אלטרנטיבות)', type: 'button', required: true, action: { type: 'upload_doc', docType: 'floor_plan', stage: 6 } },
      { id: 's6_2', label: 'שליחת התכניות ללקוח לבחירה', type: 'button', required: true, action: { type: 'navigate_tab', tab: 'documents' } },
      { id: 's6_3', label: 'פגישת אישור תכנית עמדה', type: 'button', required: false, action: { type: 'add_meeting', meetingType: 'floor_plan_approval' } },
      { id: 's6_4', label: 'אישור הלקוח + חתימה דיגיטלית', type: 'auto', required: true, action: { type: 'auto_check_floor_plan' } },
      { id: 's6_5', label: 'עדכון גאנט', type: 'button', required: false, action: { type: 'navigate_tab', tab: 'gantt' } },
    ]
  },
  7: {
    title: 'תכניות עבודה',
    items: [
      { id: 's7_1', label: 'תכנית חשמל', type: 'button', required: true, action: { type: 'upload_doc', docType: 'electrical', stage: 7 } },
      { id: 's7_2', label: 'תכנית אינסטלציה', type: 'button', required: true, action: { type: 'upload_doc', docType: 'plumbing', stage: 7 } },
      { id: 's7_3', label: 'תכנית תאורה', type: 'button', required: false, action: { type: 'upload_doc', docType: 'lighting', stage: 7 } },
      { id: 's7_4', label: 'תכנית מיזוג', type: 'button', required: false, action: { type: 'upload_doc', docType: 'hvac', stage: 7 } },
      { id: 's7_5', label: 'תכנית נגרות', type: 'button', required: false, action: { type: 'upload_doc', docType: 'carpentry', stage: 7 } },
      { id: 's7_6', label: 'אישור לקוח על התכניות', type: 'manual', required: true, milestone_key: 'stage_7_approval' },
    ]
  },
  8: {
    title: 'קונספט עיצובי + רנדרים',
    items: [
      { id: 's8_1', label: 'יצירת מודבורד', type: 'button', required: true, action: { type: 'upload_doc', docType: 'concept', stage: 8 } },
      { id: 's8_2', label: 'הדמיות / רנדרים', type: 'button', required: true, action: { type: 'upload_doc', docType: 'render', stage: 8 } },
      { id: 's8_3', label: 'אישור קונספט ע"י הלקוח', type: 'manual', required: true, milestone_key: 'stage_8_approval' },
      { id: 's8_4', label: 'פגישת אישור עיצוב', type: 'button', required: false, action: { type: 'add_meeting', meetingType: 'design_approval' } },
    ]
  },
  9: {
    title: 'ימי קניות',
    items: [
      { id: 's9_1', label: 'תכנון ימי קניות', type: 'button', required: true, action: { type: 'add_meeting', meetingType: 'shopping_day' } },
      { id: 's9_shopping_1', label: 'יום קניות 1', type: 'manual', required: false, shoppingDay: 1 },
      { id: 's9_shopping_2', label: 'יום קניות 2', type: 'manual', required: false, shoppingDay: 2 },
      { id: 's9_shopping_3', label: 'יום קניות 3', type: 'manual', required: false, shoppingDay: 3 },
      { id: 's9_shopping_4', label: 'יום קניות 4', type: 'manual', required: false, shoppingDay: 4 },
      { id: 's9_shopping_5', label: 'יום קניות 5', type: 'manual', required: false, shoppingDay: 5 },
      { id: 's9_6', label: 'העלאת חשבוניות קניות — ספקים ורכש', type: 'button', required: false, action: { type: 'navigate_tab', tab: 'suppliers' } },
    ]
  },
  10: {
    title: 'תמחור קבלנים/ספקים',
    items: [
      { id: 's10_2', label: 'השוואה ובחירת ספקים', type: 'manual', required: true, milestone_key: 'stage_10_suppliers' },
      { id: 's10_3', label: 'אישור תקציב ספקים', type: 'manual', required: false },
      { id: 's10_4', label: 'העלאת הצעות מחיר מספקים', type: 'button', required: false, action: { type: 'navigate_tab', tab: 'suppliers' } },
      { id: 's10_5', label: 'העלאת הזמנות מאושרות מספקים', type: 'button', required: false, action: { type: 'navigate_tab', tab: 'suppliers' } },
    ]
  },
  11: {
    title: 'ביצוע בשטח + ימי פיקוח',
    items: [
      { id: 's11_1', label: 'תיאום ימי פיקוח', type: 'button', required: true, action: { type: 'add_meeting', meetingType: 'site_visit' } },
      { id: 's11_2', label: 'תיעוד ליקויים / חריגות', type: 'button', required: false, action: { type: 'upload_doc', docType: 'inspection_report', stage: 11 } },
      { id: 's11_3', label: 'עדכון גאנט ותקציב', type: 'button', required: false, action: { type: 'navigate_tab', tab: 'gantt' } },
      { id: 's11_4', label: 'דיווח ללקוח', type: 'manual', required: false },
      { id: 's11_sup_1', label: 'יום פיקוח 1', type: 'manual', supervisionDay: 1 },
      { id: 's11_sup_2', label: 'יום פיקוח 2', type: 'manual', supervisionDay: 2 },
      { id: 's11_sup_3', label: 'יום פיקוח 3', type: 'manual', supervisionDay: 3 },
      { id: 's11_sup_4', label: 'יום פיקוח 4', type: 'manual', supervisionDay: 4 },
      { id: 's11_sup_5', label: 'יום פיקוח 5', type: 'manual', supervisionDay: 5 },
      { id: 's11_sup_6', label: 'יום פיקוח 6', type: 'manual', supervisionDay: 6 },
      { id: 's11_sup_7', label: 'יום פיקוח 7', type: 'manual', supervisionDay: 7 },
      { id: 's11_sup_8', label: 'יום פיקוח 8', type: 'manual', supervisionDay: 8 },
      { id: 's11_sup_9', label: 'יום פיקוח 9', type: 'manual', supervisionDay: 9 },
      { id: 's11_sup_10', label: 'יום פיקוח 10', type: 'manual', supervisionDay: 10 },
    ]
  },
  12: {
    title: 'ימי התקנה ותיאום ספקים',
    items: [
      { id: 's12_1', label: 'תיאום התקנות', type: 'button', required: true, action: { type: 'add_meeting', meetingType: 'installation_day' } },
      { id: 's12_2', label: 'ביצוע התקנה — עבודה בשטח', type: 'manual', required: true },
      { id: 's12_3', label: 'בדיקות איכות — בקרת גמר', type: 'manual', required: true },
      { id: 's12_4', label: 'העלאת דוח פיקוח', type: 'button', required: false, action: { type: 'upload_doc', docType: 'inspection_report', stage: 12 } },
      { id: 's12_5', label: 'קבלת לקוח — אישור סופי', type: 'manual', required: true, milestone_key: 'stage_12_final' },
      { id: 's12_inst_1', label: 'יום התקנה 1', type: 'manual', installationDay: 1 },
      { id: 's12_inst_2', label: 'יום התקנה 2', type: 'manual', installationDay: 2 },
      { id: 's12_inst_3', label: 'יום התקנה 3', type: 'manual', installationDay: 3 },
      { id: 's12_inst_4', label: 'יום התקנה 4', type: 'manual', installationDay: 4 },
      { id: 's12_inst_5', label: 'יום התקנה 5', type: 'manual', installationDay: 5 },
      { id: 's12_inst_6', label: 'יום התקנה 6', type: 'manual', installationDay: 6 },
      { id: 's12_inst_7', label: 'יום התקנה 7', type: 'manual', installationDay: 7 },
      { id: 's12_inst_8', label: 'יום התקנה 8', type: 'manual', installationDay: 8 },
      { id: 's12_inst_9', label: 'יום התקנה 9', type: 'manual', installationDay: 9 },
      { id: 's12_inst_10', label: 'יום התקנה 10', type: 'manual', installationDay: 10 },
    ]
  },
  13: {
    title: 'סיום פרויקט ומסירה',
    items: [
      { id: 's13_collage', label: 'העלאת תמונות לקולאז׳ סיום', type: 'button', required: false, action: { type: 'upload_doc_or_drive', docType: 'photo', stage: 13 } },
      { id: 's13_2', label: 'סגירה פיננסית — כל התשלומים שולמו', type: 'auto', required: true, action: { type: 'auto_check_payments' } },
      { id: 's13_4', label: 'תיעוד לקחים', type: 'manual', required: false },
    ]
  }
};

export default STAGE_CHECKLISTS;

export function getStageChecklist(stageNum) {
  return STAGE_CHECKLISTS[stageNum] || null;
}

export function getChecklistCompletion(stageNum, checklistData) {
  const config = STAGE_CHECKLISTS[stageNum];
  if (!config) return { total: 0, completed: 0, percent: 0, requiredMet: true };
  
  const data = checklistData?.[stageNum] || {};
  const total = config.items.length;
  const completed = config.items.filter(item => data[item.id]).length;
  const requiredMet = config.items
    .filter(item => item.required)
    .every(item => data[item.id]);
  
  return {
    total,
    completed,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    requiredMet,
  };
}