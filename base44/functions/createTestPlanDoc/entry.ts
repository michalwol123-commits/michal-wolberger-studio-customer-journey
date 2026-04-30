import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  // 1. Create a blank Google Doc via Drive API
  const { accessToken: driveToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${driveToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'תכנית בדיקות — CRM מיכל וולברגר',
      mimeType: 'application/vnd.google-apps.document',
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    return Response.json({ error: 'Failed to create doc', detail: err }, { status: 500 });
  }

  const file = await createRes.json();
  const docId = file.id;

  // 2. Write content to the doc via Google Docs API
  const { accessToken: docsToken } = await base44.asServiceRole.connectors.getConnection('googledocs');

  const requests = buildDocRequests();

  const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${docsToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!updateRes.ok) {
    const err = await updateRes.text();
    return Response.json({ error: 'Failed to write doc', detail: err }, { status: 500 });
  }

  const docUrl = `https://docs.google.com/document/d/${docId}/edit`;
  return Response.json({ success: true, docUrl, docId });
});

function buildDocRequests() {
  // Build document content — inserted in REVERSE order since we always insert at index 1
  const sections = [];

  // We'll build text blocks and then create insertText requests
  const blocks = [];

  // Title
  blocks.push({ text: 'תכנית בדיקות — CRM מיכל וולברגר\n', style: 'HEADING_1' });
  blocks.push({ text: 'גרסה 5.0 | תאריך: ' + new Date().toLocaleDateString('he-IL') + '\n\n', style: 'NORMAL_TEXT' });

  // ===== PART A =====
  blocks.push({ text: 'חלק A — Entities (ארכיטקטורת נתונים)\n', style: 'HEADING_1' });

  blocks.push({ text: 'A1: Client Entity\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'יצירת ליד חדש — לידים → "ליד חדש" → מלא שם + טלפון → רשומה נוצרת עם status=lead',
    'שדות חובה — נסה ליצור ליד בלי שם או טלפון → שגיאת ולידציה',
    'שדה source — בדוק שכל ערכי ה-enum קיימים: facebook, instagram, referral, google, website, whatsapp, other',
    'שדה budget_range — בדוק enum: up_to_100k, 100_300k, 300_500k, above_500k',
    'שדה property_type — בדוק enum: apartment, house, office, commercial',
    'שדה tags — בדוק multi-select: VIP, returning, cold, priority, referral_source',
    'שדה notes — הזן הערה ארוכה → נשמרת ומוצגת',
    'Portal token — לחץ "העתק קישור פורטל" בפרופיל לקוח → token נוצר + קישור הועתק',
    'ביטול token — לחץ "בטל קישור" → portal_token_revoked=true',
    'חידוש token — לחץ "חדש קישור" → token חדש, הישן לא עובד',
  ]) });

  blocks.push({ text: 'A2: Project Entity\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'יצירת פרויקט — צור פרויקט חדש עם client_id → נוצר עם stage_current=1, status=active',
    '13 שלבים — פתח Project Detail → בדוק שיש 13 שלבים ב-StageSelector',
    'שדות sX_status — בדוק שכל s1 עד s13 קיימים עם ערכים: pending/in_progress/completed',
    'שדה progress — עדכן progress ל-50 → מוצג בסקירה',
    'שדה total_budget — הזן תקציב → מוצג בפורמט ₪',
    'תאריכי פרויקט — מלא start_date + end_date_est → מוצגים בפורמט dd/MM/yyyy',
  ]) });

  blocks.push({ text: 'A3: Quote Entity\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'יצירת הצעה — צור הצעת מחיר ללקוח → נוצרת עם status=draft',
    'שדה package_type — בדוק: basic, mid, premium',
    'שדה url — הזן קישור ל-PDF → נשמר ולחיץ',
    'שדה version — בדוק ברירת מחדל 1',
  ]) });

  blocks.push({ text: 'A4: Payment Entity\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'יצירת תשלום — צור תשלום לפרויקט → נוצר עם status=pending',
    'שדות סכום — הזן amount + amount_paid → מוצגים בפורמט ₪',
    'שדה due_date — הזן תאריך יעד → מוצג בפורמט dd/MM/yyyy',
    'Admin only — צא ל-user רגיל → נסה לגשת לתשלומים → לא מוצג / הפניה',
  ]) });

  blocks.push({ text: 'A5: Communication Entity\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'סוגי תקשורת — בדוק: whatsapp, email, call, meeting, note, system_error, portal_activity',
    'שדה direction — בדוק inbound/outbound → חצים שונים מוצגים',
    'שדה error_detail — גלוי רק ל-Admin, Staff לא רואה',
  ]) });

  blocks.push({ text: 'A6: Meeting Entity\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'סוגי פגישה — בדוק: intro, qualifying, stage_review, site_visit, zoom, design_approval',
    'תצוגה שבועית — נווט בין שבועות → פגישות מסוננות נכון',
    'קישור ללקוח — לחץ על שם לקוח בפגישה → מוביל לפרופיל',
  ]) });

  blocks.push({ text: 'A7: Document Entity\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'העלאת מסמך — Project Detail → מסמכים → העלאת מסמך → קובץ עולה + רשומה נוצרת',
    'סוגי מסמך — בדוק כל 11 הסוגים (plan, concept, render...)',
    'שיוך שלב — בחר שלב 1-13 → נשמר נכון',
    'visible_to_client — סמן ✓ → מסמך גלוי בפורטל',
    'Versioning — העלה מסמך עם אותו שם → מוצע כגרסה חדשה',
    'קבלת גרסה — אשר כגרסה 2 → גרסה 1 = is_current:false, גרסה 2 = is_current:true',
    'העלאה מ-StagePanel — לחץ על שלב → העלה מסמך → שדה "שלב" ממולא אוטומטית',
  ]) });

  blocks.push({ text: 'A8: Task Entity\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'יצירת משימה — משימות → "משימה חדשה" → נוצרת עם status=open',
    'שינוי סטטוס — לחץ "התחל" / "סיים" → עוברת open→in_progress→done',
    'סוגי משימה — בדוק: followup, payment_reminder, approval, site_visit, supplier_contact, manual, automation_failed',
    'עדיפויות — בדוק: low, normal, high, urgent → צבעים שונים',
    'Kanban — 4 עמודות: פתוח, בביצוע, הושלם, בוטל → מוצגות נכון',
  ]) });

  // ===== PART B =====
  blocks.push({ text: 'חלק B — Views (12 מסכים)\n', style: 'HEADING_1' });

  blocks.push({ text: 'B1: Dashboard (מסך ראשי)\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'KPI — לידים חדשים (שבוע) → מספר נכון של לידים ב-7 ימים אחרונים',
    'KPI — פגישות היום → מספר נכון של פגישות scheduled להיום',
    'KPI — תשלומים באיחור → מוצג רק ל-Admin, סכום נכון',
    'KPI — משימות פתוחות → open + in_progress',
    'KPI — פרויקטים פעילים → ספירה נכונה של active',
    'KPI — ערך Pipeline → SUM של total_budget מפרויקטים active',
    'KPI — Conversion Rate → (active+completed) / total × 100',
    'Widget — התראות קריטיות → שגיאות, פגישות בלי סיכום, כפילויות',
    'Widget — שירות לקוחות → מדדי שירות מוצגים',
    'לידים אחרונים → 5 לידים אחרונים עם קישורים',
    'משימות קרובות → 5 משימות פתוחות/בביצוע',
  ]) });

  blocks.push({ text: 'B2: Pipeline Kanban\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    '7 עמודות — lead, qualified, proposal_sent, proposal_approved, active_client, completed_client, archived',
    'כרטיס לקוח — שם, טלפון, source, tags',
    'ספירות — מספר לקוחות בכל עמודה נכון',
    'קישור — לחיצה → פרופיל לקוח',
  ]) });

  blocks.push({ text: 'B3: Leads\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'סינון — רק status=lead, לא מופיעים סטטוסים אחרים',
    'חיפוש — חפש לפי שם/טלפון/אימייל → תוצאות נכונות',
    'יצירת ליד — לחיצה על "ליד חדש" → דיאלוג נפתח',
    'ספירה — subtitle מציג מספר לידים נכון',
  ]) });

  blocks.push({ text: 'B4: Clients List\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'סינון בסיסי — רק qualified, proposal_sent, proposal_approved, active_client, completed_client',
    'סינון סטטוס — בחר סטטוס ספציפי → רק אותו סטטוס',
    'חיפוש — לפי שם/טלפון/אימייל → עובד',
  ]) });

  blocks.push({ text: 'B5: Client Profile\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'פרטי לקוח — שם, טלפון, אימייל, כתובת, תקציב, סוג נכס, מקור → כולם מוצגים',
    'שינוי סטטוס — dropdown → שנה סטטוס → מתעדכן',
    'Tab פרויקטים — רשימת פרויקטים של הלקוח → מקושרים נכון',
    'Tab תשלומים (Admin) — טבלת תשלומים → גלוי רק ל-Admin',
    'Tab מסמכים — מסמכים + כפתור העלאה → עובד',
    'Tab תקשורת — לוג הודעות → system_error רק ל-Admin',
    'Portal buttons — העתק/צפה/חדש/בטל קישור → כולם עובדים',
  ]) });

  blocks.push({ text: 'B6: Projects\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'תצוגת פרויקטים — פרויקטים מקובצים לפי שלב → סדר נכון',
    'קישור — לחיצה → Project Detail → ניווט תקין',
    'סינון סטטוס — active/on_hold/completed/cancelled → עובד',
  ]) });

  blocks.push({ text: 'B7: Project Detail\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'Header — שם פרויקט + לקוח (קישור) + סטטוס → מוצג',
    'StageSelector — 13 שלבים לחיצים → כל שלב נפתח',
    'סטטוס שלב — pending=אפור, in_progress=כתום, completed=ירוק+✓ → נכון',
    'StagePanel — לחץ על שלב → מסמכים, גלריה (שלב 8) → תוכן רלוונטי',
    'Tab סקירה — תקציב, התקדמות, תאריכים, הערות → מוצג',
    'Tab תשלומים — Admin only, טבלה → מוסתר ל-Staff',
    'Tab מסמכים — רשימה + העלאה → עובד',
    'Tab משימות — רשימת משימות הפרויקט → סטטוס + תאריך',
    'Tab תקשורת — לוג הודעות → מסונן לפרויקט',
    'חזרה — "חזרה לפרויקטים" → חוזר לרשימה',
  ]) });

  blocks.push({ text: 'B8: Payments\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'Admin only — Staff אינו רואה בתפריט → מופנה ל-/',
    'KPIs — ממתינים/באיחור/שולם → סכומים נכונים',
    'סינון — לפי סטטוס → עובד',
    'קישור ללקוח/פרויקט — שמות מוצגים → נכונים',
  ]) });

  blocks.push({ text: 'B9: Meetings\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'ניווט שבועי — הקודם/היום/הבא → תאריכים נכונים',
    'קיבוץ יומי — פגישות מקובצות לפי יום → סדר נכון',
    'פרטי פגישה — סוג, שעה, משך, מיקום, לקוח, סטטוס → כולם מוצגים',
  ]) });

  blocks.push({ text: 'B10: Communications\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'סינון סוג — WhatsApp, אימייל, שיחה, פגישה, הערה, (system_error רק Admin) → עובד',
    'חיפוש — בתוכן ושם לקוח → עובד',
    'כיוון — חצים שונים ל-inbound/outbound → מוצגים',
    'error_detail — מוצג רק ל-Admin → Staff לא רואה',
  ]) });

  blocks.push({ text: 'B11: Tasks Kanban\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    '4 עמודות — פתוח, בביצוע, הושלם, בוטל → כולן',
    'פעולות מהירות — "התחל" / "סיים" → מעדכנות סטטוס',
    'שם לקוח — מוצג בכרטיס → נכון',
  ]) });

  // ===== PART C =====
  blocks.push({ text: 'חלק C — Client Portal (פורטל לקוח)\n', style: 'HEADING_1' });

  blocks.push({ text: 'C1: גישה וזיהוי\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'Magic Link תקין — פתח URL עם token → נטען לפרופיל הלקוח',
    'Token שגוי — שנה token ב-URL → מסך שגיאה',
    'Token מבוטל — בטל token ב-CRM → נסה → מסך שגיאה',
  ]) });

  blocks.push({ text: 'C2: מצבי תצוגה\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'אין פרויקט — status=lead/qualified → מסך ברוכים הבאים + הצעות',
    'פרויקט בודד — פרויקט active אחד → ישר לתצוגת פרויקט',
    'כמה פרויקטים — 2+ פרויקטים → רשימת פרויקטים לבחירה',
    'פרויקט הושלם — status=completed → מסך סיום + NPS + גלריה',
  ]) });

  blocks.push({ text: 'C3: תצוגת פרויקט בפורטל\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'Timeline שלבים — 13 שלבים עם סטטוסים → הושלם=✓ ירוק, בביצוע=כחול, עתידי=אפור',
    'מסמכים גלויים — רק visible_to_client=true → מסמכים פנימיים לא נראים',
    'תשלומים — סכום + סטטוס → חשבונית לא גלויה',
    'פגישות קרובות — scheduled_at עתידי → מוצגות',
  ]) });

  blocks.push({ text: 'C4: אישור הצעה בפורטל\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'הצגת הצעה — status=sent/viewed → מוצגת עם כפתור אישור',
    'אישור — לחץ "אשר הצעה" → status=approved',
    'דחייה — לחץ "דחה" → status=rejected',
  ]) });

  // ===== PART D =====
  blocks.push({ text: 'חלק D — State Machines (אכיפת מעברים)\n', style: 'HEADING_1' });

  blocks.push({ text: 'D1: Client State Machine\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    '✅ lead → qualified — מותר',
    '✅ lead → archived — מותר',
    '✅ qualified → proposal_sent — מותר',
    '✅ qualified → lead — מותר (חזרה)',
    '✅ proposal_sent → proposal_approved — מותר',
    '✅ proposal_sent → archived — מותר',
    '✅ proposal_approved → active_client — מותר',
    '✅ active_client → completed_client — מותר',
    '❌ lead → active_client — Rollback!',
    '❌ completed_client → lead — Rollback!',
    '❌ archived → lead — Rollback!',
  ]) });

  blocks.push({ text: 'D2: Project State Machine\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    '✅ active → on_hold — מותר',
    '✅ active → completed — מותר',
    '✅ active → cancelled — מותר',
    '✅ on_hold → active — מותר',
    '❌ completed → active — Rollback!',
    '❌ cancelled → active — Rollback!',
  ]) });

  blocks.push({ text: 'D3: Quote State Machine\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    '✅ draft → sent — מותר',
    '✅ sent → viewed — מותר',
    '✅ viewed → approved — מותר',
    '✅ viewed → rejected — מותר',
    '❌ approved → draft — Rollback!',
  ]) });

  blocks.push({ text: 'D4: Task State Machine\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    '✅ open → in_progress — מותר',
    '✅ in_progress → done — מותר',
    '✅ open → cancelled — מותר',
    '❌ done → open — Rollback!',
  ]) });

  blocks.push({ text: 'D5: Rollback Logging\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'לאחר rollback — בדוק Communications → type=system_error → רשומת שגיאה עם פירוט',
  ]) });

  // ===== PART E =====
  blocks.push({ text: 'חלק E — Automations\n', style: 'HEADING_1' });

  blocks.push({ text: 'E1: A — מענה לליד חדש (autoLeadResponse)\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'יצירת ליד חדש → Communication WhatsApp outbound נוצר',
    'Task followup → Task "Follow-up ליד חדש" עם due_date = מחר',
    'first_response_at → מתעדכן',
  ]) });

  blocks.push({ text: 'E2: B — תזכורות פגישה (autoMeetingReminder)\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'פגישה מחר → Communication תזכורת D-1 + reminder_d1_sent=true',
    'פגישה בעוד שעה → Communication תזכורת H-1 + reminder_h1_sent=true',
  ]) });

  blocks.push({ text: 'E3: D — עדכון שלב (autoStageAdvance)\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'sX_status → completed → stage_current++ + s{next}=in_progress',
    'Communication → WhatsApp ללקוח על שלב שהושלם',
    'Task → משימת הכנה לשלב הבא (due_date = +2 ימים)',
  ]) });

  blocks.push({ text: 'E4: E — תשלום באיחור (autoOverduePayments)\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'Payment עם due_date < today + status=pending → status=overdue + Communication + Task',
  ]) });

  blocks.push({ text: 'E5: H — כפילויות (autoDuplicateDetection)\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'צור ליד עם טלפון קיים → duplicate_of מולא + Task "בדוק כפילות"',
  ]) });

  blocks.push({ text: 'E6: I — State Machine Automations\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'Automations קיימות — Client, Project, Quote, Task, Payment — כולן Active (5 automations)',
  ]) });

  blocks.push({ text: 'E7: J — Quote Approval (autoQuoteApproval)\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'Quote status → approved → Project נוצר + Payments + Client → active_client',
  ]) });

  blocks.push({ text: 'E8: K — Retry Communications (autoRetryComms)\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'Communication status=failed, retry_count<3 → retry_count++ + ניסיון שליחה חוזר',
  ]) });

  blocks.push({ text: 'E9: Scheduled Automations\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'Email Sender — פעיל, כל 5 דקות',
    'WhatsApp Sender — פעיל, כל 5 דקות (cron)',
    'Communication Retry — פעיל, כל 5 דקות',
  ]) });

  // ===== PART F =====
  blocks.push({ text: 'חלק F — RBAC (הרשאות)\n', style: 'HEADING_1' });

  blocks.push({ text: 'F1: Admin\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'רואה את כל הלקוחות → כן',
    'רואה תשלומים → כן',
    'רואה system_error → כן',
    'גישה לכל המסכים → 13 מסכים',
  ]) });

  blocks.push({ text: 'F2: Staff\n', style: 'HEADING_2' });
  blocks.push({ text: testLines([
    'Dashboard — רואה רק owner=me, לא רואה שגיאות מערכת',
    'Payments — לא רואה בתפריט / מופנה → מוסתר',
    'Tasks — רק assigned_to=me → אחרות לא מופיעות',
    'Communications — system_error לא מוצג → מסונן',
  ]) });

  // ===== PART G =====
  blocks.push({ text: 'חלק G — ניווט וUI כללי\n', style: 'HEADING_1' });
  blocks.push({ text: testLines([
    'Sidebar — כל 11 הקישורים + Settings + User Guide → מנווט נכון',
    'RTL — כל הממשק בעברית, מימין לשמאל → תקין',
    'Mobile responsive — פתח על טלפון → כל המסכים קריאים',
    'טעינה — Loading spinner בטעינה → לא מסך ריק',
    'Empty states — מסך ללא נתונים → אייקון + הודעה',
    'לינקים פנימיים — כל הלינקים בין מסכים → עובדים בלי 404',
    'User Guide — /user-guide → Admin only, נפתח',
    'Settings — /settings → Admin only',
  ]) });

  // ===== PART H =====
  blocks.push({ text: 'חלק H — מסלול End-to-End (קריטי!)\n', style: 'HEADING_1' });
  blocks.push({ text: testLines([
    'שלב 1: ליד חדש — צור ליד "לקוח בדיקה" → בדוק autoLeadResponse',
    'שלב 2: Qualified — שנה סטטוס ל-qualified',
    'שלב 3: הצעת מחיר — צור Quote → שנה ל-sent',
    'שלב 4: אישור הצעה — שנה Quote ל-approved → בדוק שנוצר Project + Client=active_client',
    'שלב 5: פתח פורטל — העתק קישור פורטל → פתח → בדוק תצוגת פרויקט',
    'שלב 6: העלאת מסמך — העלה מסמך לשלב 1 (visible_to_client=true) → בדוק בפורטל',
    'שלב 7: קדם שלב — עדכן s1_status=completed → בדוק stage_current=2',
    'שלב 8: צור תשלום — צור Payment עם due_date=אתמול → בדוק autoOverduePayments',
    'שלב 9: צור משימה — צור Task → התחל → סיים → בדוק completed_at',
    'שלב 10: גלריה שלב 8 — העלה render/concept לשלב 8 → בדוק StageGallery + lightbox',
    'שלב 11: סיום פרויקט — עדכן כל sX=completed → status=completed → בדוק autoProjectCompletion',
    'שלב 12: NPS — בפורטל → דרג שביעות רצון',
    'שלב 13: ניקוי — מחק נתוני בדיקה',
  ]) });

  blocks.push({ text: '\nעצות לביצוע:\n', style: 'HEADING_2' });
  blocks.push({ text: 
    '• עבדי שלב-שלב לפי הסדר (A→B→C→D→E→F→G→H)\n' +
    '• סמני ✅ או ❌ בכל שורה\n' +
    '• אם יש ❌ — כתבי מה בדיוק לא עובד\n' +
    '• חלק H (End-to-End) הוא הבדיקה הקריטית ביותר — שם רואים את "התמונה הגדולה"\n',
    style: 'NORMAL_TEXT'
  });

  // Now build the actual requests — insert all text at position 1, in reverse order
  const requests = [];
  let currentIndex = 1;

  for (const block of blocks) {
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: block.text,
      },
    });

    const startIndex = currentIndex;
    const endIndex = currentIndex + block.text.length;

    if (block.style && block.style.startsWith('HEADING')) {
      requests.push({
        updateParagraphStyle: {
          range: { startIndex, endIndex: startIndex + block.text.split('\n')[0].length + 1 },
          paragraphStyle: { namedStyleType: block.style },
          fields: 'namedStyleType',
        },
      });
    }

    currentIndex = endIndex;
  }

  return requests;
}

function testLines(lines) {
  return lines.map((line, i) => `☐ ${i + 1}. ${line}`).join('\n') + '\n\n';
}