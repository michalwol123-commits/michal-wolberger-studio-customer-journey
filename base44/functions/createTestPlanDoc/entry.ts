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
      name: 'מסלול בדיקות E2E — CRM מיכל וולברגר',
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
  const blocks = [];

  // ===== TITLE =====
  blocks.push({ text: 'מסלול בדיקות מקצה לקצה — CRM מיכל וולברגר\n', style: 'HEADING_1' });
  blocks.push({ text: `תאריך: ${new Date().toLocaleDateString('he-IL')} | גרסה 6.0 — מסלול E2E מלא\n\n`, style: 'NORMAL_TEXT' });

  // ===== PREP =====
  blocks.push({ text: 'הכנה לפני תחילת הבדיקות\n', style: 'HEADING_1' });
  blocks.push({ text: lines([
    'מחקי כל רשומות בדיקה קודמות (לקוחות/פרויקטים/משימות של "בדיקה")',
    'ודאי שאת מחוברת כ-admin (מיכל)',
    'פתחי את המערכת בשני חלונות: CRM (רגיל) + פורטל (אנונימי)',
  ]) });

  // ===== STEP 0 =====
  blocks.push({ text: 'שלב 0 — יצירת ליד חדש\n', style: 'HEADING_1' });
  blocks.push({ text: '👩 מיכל (אדמין)\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'עמוד לידים → "+ הוסף ליד" → שם: "לקוח בדיקה", טלפון: 0501234567, אימייל: test@test.com, מקור: facebook',
    'הליד נוצר בסטטוס lead ✅',
  ]) });
  blocks.push({ text: '🤖 אוטומציה A (autoLeadResponse) — חכי 10-15 שניות\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'בדקי בעמוד משימות: נוצרה משימה "פנייה ראשונית — לקוח בדיקה" בעדיפות גבוהה',
    'בדקי בעמוד תקשורת: נוצרה הודעת WhatsApp pending "תודה על הפנייה"',
    'בכרטיס הלקוח: first_response_at מעודכן',
  ]) });

  // ===== STEP 1 =====
  blocks.push({ text: 'שלב 1 — קידום ליד → מתעניין (qualified)\n', style: 'HEADING_1' });
  blocks.push({ text: '👩 מיכל\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'כרטיס לקוח → שני סטטוס ל-"מתעניין" (qualified)',
    'הסטטוס משתנה ל-qualified ✅',
  ]) });
  blocks.push({ text: '🤖 State Machine I\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'last_valid_status = qualified ✅',
    'qualified_at מעודכן ✅',
  ]) });
  blocks.push({ text: '🧪 בדיקה שלילית\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'נסי לשנות סטטוס ישירות ל-active_client → State Machine חוסם → rollback ל-qualified ✅',
    'בדקי בתקשורת: רשומת system_error על מעבר לא חוקי ✅',
  ]) });

  // ===== STEP 2 =====
  blocks.push({ text: 'שלב 2 — שיחת היכרות (פגישה + תשלום)\n', style: 'HEADING_1' });
  blocks.push({ text: '👩 מיכל\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'עמוד פגישות → "+ הוסף פגישה" → סוג: qualifying, לקוח: "לקוח בדיקה", תאריך: מחר',
    'הפגישה נוצרה ✅',
  ]) });
  blocks.push({ text: '🤖 אוטומציה qualifying (autoQualifyingPayment) — חכי 10-15 שניות\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'תשלומים: נוצר תשלום ₪250 "תשלום לפגישת היכרות" ✅',
    'משימות: נוצרה משימה "תזכורת תשלום לפגישת היכרות" ✅',
    'תקשורת: רשומת note על יצירת התשלום ✅',
  ]) });

  // ===== STEP 3 =====
  blocks.push({ text: 'שלב 3 — הצעת מחיר\n', style: 'HEADING_1' });
  blocks.push({ text: '👩 מיכל\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'סטטוס לקוח → "הצעה נשלחה" (proposal_sent) → State Machine מאשר ✅',
    'עמוד הצעות מחיר → "+ הצעה חדשה" → לקוח: "לקוח בדיקה", סכום: 50,000₪, חבילה: mid, URL: כתובת כלשהי, סטטוס: draft',
    'ההצעה נוצרה ✅',
    'שני סטטוס הצעה ל-sent → State Machine: draft→sent מותר ✅',
    'שני סטטוס הצעה ל-viewed → State Machine: sent→viewed מותר ✅',
    'שני סטטוס הצעה ל-approved → State Machine: viewed→approved מותר ✅',
  ]) });

  // ===== STEP 4 =====
  blocks.push({ text: 'שלב 4 — אישור הצעה → פרויקט נפתח אוטומטית! (קריטי!)\n', style: 'HEADING_1' });
  blocks.push({ text: '🤖 אוטומציה J (autoQuoteApproval) — חכי 15-20 שניות\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'פרויקטים: נוצר פרויקט חדש בסטטוס active, שלב 1, progress=0 ✅',
    'תשלומים: 3 תשלומים נוצרו: מקדמה 40% (₪20,000), אמצע 30% (₪15,000), סיום 30% (₪15,000) ✅',
    'לקוח: סטטוס עודכן ל-active_client + portal_token נוצר ✅',
    'תקשורת: הודעת WhatsApp "ההצעה אושרה ופרויקט נפתח!" ✅',
  ]) });

  // ===== STEP 5 =====
  blocks.push({ text: 'שלב 5 — קידום שלבי פרויקט (1→13)\n', style: 'HEADING_1' });

  blocks.push({ text: '5A: קידום מ-1 ל-2 (שיחת היכרות)\n', style: 'HEADING_2' });
  blocks.push({ text: '👩 מיכל\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'כרטיס פרויקט → העבירי שלב נוכחי ל-שלב 2',
  ]) });
  blocks.push({ text: '🤖 אוטומציה D (autoStageAdvance)\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    's1_status = completed, s2_status = in_progress, progress ≈ 8% ✅',
    'תקשורת: הודעה "עברנו לשלב 2 — שיחת היכרות" ✅',
    'משימות: "הכנה לשלב 2 — שיחת היכרות" ✅',
  ]) });

  blocks.push({ text: '5B: קידום מ-2 ל-3 (הצעת מחיר)\n', style: 'HEADING_2' });
  blocks.push({ text: lines([
    'קדמי פרויקט ל-שלב 3 → s2=completed, s3=in_progress, progress ≈ 15% ✅',
    'אוטומציה autoStageTask: נוצרה משימה "הכנת הצעת מחיר" בעדיפות גבוהה ✅',
  ]) });

  blocks.push({ text: '5C: קידום מ-3 ל-4 (סגירת פרויקט)\n', style: 'HEADING_2' });
  blocks.push({ text: '👩 מיכל\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'קדמי ל-שלב 4 → stage_current = 4',
    'סמני s4_status ל-completed ידנית',
  ]) });
  blocks.push({ text: '🤖 אוטומציה Welcome (autoWelcomeClient)\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'לקוח: סטטוס = active_client ✅',
    'אימייל: "ברוכים הבאים" נשלח (בדקי Communication סוג email) ✅',
  ]) });

  blocks.push({ text: '5D-5K: קידום שלבים 5-12 (לכל שלב)\n', style: 'HEADING_2' });
  blocks.push({ text: lines([
    'לכל קידום שלב: Stage Advance (D) רץ → שלב קודם=completed, חדש=in_progress, progress עולה ✅',
    'נוצרת משימה "הכנה לשלב X" ✅',
    'נוצרת תקשורת WhatsApp "עברנו לשלב X" ✅',
  ]) });
  blocks.push({ text: 'בדיקות ספציפיות לפי שלב:\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'שלב 5 (שאלון): סמני s5=completed → אוטומציה autoStageTask מעדכנת Client ל-qualified (אם lead)',
    'שלב 6 (גאנט): צרי אבני דרך (milestones) → בדקי שהן מופיעות בגאנט',
    'שלב 8 (קונספט): העלי מסמך עם visible_to_client=true → אוטומציה DocNotification שולחת WhatsApp',
    'שלב 9 (קניות): עדכני shopping_days_used → בדקי שמתעדכן בפורטל',
    'שלב 10 (ספקים): צרי ספק + שייכי לפרויקט + צרי הזמנת רכש',
    'שלב 11 (ביצוע): צרי budget items עם actual > planned×1.1 → אוטומציה יומית תיצור התראת חריגה',
  ]) });

  // ===== STEP 6 =====
  blocks.push({ text: 'שלב 6 — בדיקת תשלומים\n', style: 'HEADING_1' });
  blocks.push({ text: lines([
    'בדקי שיש 3 תשלומים (מקדמה, אמצע, סיום) → סכומים: 20K/15K/15K ✅',
    'עדכני תשלום מקדמה: amount_paid=20000, paid_date=היום, status=paid → State Machine: pending→paid ✅',
    'עדכני תשלום אמצע: amount_paid=5000, status=partial → partial מותר ✅',
    'בדיקת overdue: שני due_date של תשלום סיום לתאריך שעבר → אוטומציה F (08:00 יומי) תסמן כ-overdue + Task urgent',
  ]) });

  // ===== STEP 7 =====
  blocks.push({ text: 'שלב 7 — בדיקת הפורטל (צד לקוח)\n', style: 'HEADING_1' });
  blocks.push({ text: '👩 מיכל\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'כרטיס לקוח → "צפה בפורטל" → העתיקי URL',
  ]) });
  blocks.push({ text: '👤 כלקוח (חלון אנונימי)\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'פתחי URL → רואים "שלום + שם הלקוח" ✅',
    'רואים את הפרויקט + שלב נוכחי + progress ✅',
    'מסמכים: רואים רק visible_to_client=true ✅',
    'גאנט: לוח זמנים מוצג ✅',
    'כפתור "מדריך" בהדר → מדריך הלקוח מוצג ✅',
  ]) });
  blocks.push({ text: '👩 מיכל → 👤 לקוח\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'מיכל: העלי מסמך חדש עם approval_status=pending + visible_to_client=true',
    'לקוח בפורטל: בדקי שהמסמך מופיע → לחצי "מאשר" → approval_status=approved ✅',
  ]) });

  // ===== STEP 8 =====
  blocks.push({ text: 'שלב 8 — סיום פרויקט (שלב 13)\n', style: 'HEADING_1' });
  blocks.push({ text: '👩 מיכל\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'קדמי ל-שלב 13 → stage_current = 13',
    'שני סטטוס פרויקט ל-completed',
  ]) });
  blocks.push({ text: '🤖 אוטומציה G (autoProjectCompletion) — חכי 15-20 שניות\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'end_date_actual מעודכן ✅',
    'לקוח: סטטוס → completed_client ✅',
    'תקשורת: WhatsApp "הפרויקט הושלם!" ✅',
    'משימות: "פולואפ סיום" — לשלוח NPS ✅',
  ]) });
  blocks.push({ text: '👤 לקוח בפורטל\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'רענני → מסך "הפרויקט הושלם" (PortalCompleted) מוצג ✅',
  ]) });

  // ===== STEP 9 =====
  blocks.push({ text: 'שלב 9 — בדיקות State Machine שליליות (ניסיון שבירה)\n', style: 'HEADING_1' });
  blocks.push({ text: lines([
    'נסי להחזיר פרויקט completed → active → State Machine חוסם (completed → [] ריק) ❌✅',
    'נסי להחזיר לקוח archived → active_client → ארכיון → רק lead ❌✅',
    'נסי לשנות הצעה approved → sent → approved → [] ❌✅',
    'נסי לשנות תשלום paid → pending → paid → [] ❌✅',
  ]) });

  // ===== STEP 10 =====
  blocks.push({ text: 'שלב 10 — בדיקת דוחות וייצוא\n', style: 'HEADING_1' });
  blocks.push({ text: lines([
    'עמוד דוחות → טאב פרויקטים → הפרויקט מופיע בסטטיסטיקות ✅',
    'טאב כספי → 3 תשלומים מופיעים, סכומים נכונים ✅',
    'טאב הצעות מחיר → ההצעה מופיעה ב-funnel ✅',
    'טאב ספקים → הספק שנוצר מופיע ✅',
    'ייצוא CSV מכל עמוד → הקובץ יורד, מכיל נתוני בדיקה ✅',
    'ייצוא PDF מדוחות → PDF נוצר ✅',
    'חיפוש גלובלי (⌘K) → חפשי "לקוח בדיקה" → מוצא לקוח, פרויקט, הצעה ✅',
  ]) });

  // ===== STEP 11 =====
  blocks.push({ text: 'שלב 11 — ניקוי\n', style: 'HEADING_1' });
  blocks.push({ text: lines([
    'מחקי את "לקוח בדיקה" + הפרויקט + ההצעה + התשלומים + המשימות שנוצרו',
    'ודאי שאין שאריות בדשבורד/התראות',
  ]) });

  // ===== SUMMARY TABLE =====
  blocks.push({ text: '\nסיכום אוטומציות שצריכות לרוץ במהלך הבדיקה:\n', style: 'HEADING_1' });
  blocks.push({ text:
    'A — autoLeadResponse → שלב 0 (יצירת ליד)\n' +
    'I — autoStateMachine → שלבים 1, 3, 6, 8, 9 (כל שינוי סטטוס)\n' +
    'qualifying — autoQualifyingPayment → שלב 2 (פגישת היכרות)\n' +
    'J — autoQuoteApproval → שלב 4 (אישור הצעה)\n' +
    'D — autoStageAdvance → שלב 5 (כל קידום שלב)\n' +
    'autoStageTask → שלב 5B, 5D (s2/s5 completed)\n' +
    'autoWelcomeClient → שלב 5C (s4 completed)\n' +
    'autoDocNotification → שלב 5 (מסמך visible_to_client)\n' +
    'F — autoOverduePayments → שלב 6 (תשלום באיחור)\n' +
    'G — autoProjectCompletion → שלב 8 (סיום פרויקט)\n' +
    'autoBudgetAlert → שלב 5 (חריגת תקציב — יומי)\n' +
    'autoGanttDelayAlert → שלב 5 (עיכוב גאנט — יומי)\n\n',
    style: 'NORMAL_TEXT'
  });

  blocks.push({ text: 'עצות לביצוע:\n', style: 'HEADING_2' });
  blocks.push({ text:
    '• עבדי שלב-שלב לפי הסדר (0→1→2→...→11)\n' +
    '• סמני ✅ או ❌ בכל שורה\n' +
    '• אחרי כל אוטומציה — חכי 15 שניות ורענני\n' +
    '• אם יש ❌ — כתבי מה בדיוק לא עובד + צילום מסך\n' +
    '• שלב 4 (אישור הצעה) הוא הקריטי ביותר — שם הכי הרבה אוטומציות רצות\n',
    style: 'NORMAL_TEXT'
  });

  // Build the actual Google Docs API requests
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

function lines(items) {
  return items.map((line, i) => `☐ ${i + 1}. ${line}`).join('\n') + '\n\n';
}