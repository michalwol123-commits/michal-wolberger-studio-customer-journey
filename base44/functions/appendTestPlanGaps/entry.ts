import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DOC_ID = '17LjmFDvDhy5lAIRVfMxGVk3wA-BakrymjzX76NKoXs0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  // 1. Get current document length
  const { accessToken: docsToken } = await base44.asServiceRole.connectors.getConnection('googledocs');

  const docRes = await fetch(`https://docs.googleapis.com/v1/documents/${DOC_ID}`, {
    headers: { 'Authorization': `Bearer ${docsToken}` },
  });
  if (!docRes.ok) {
    return Response.json({ error: 'Failed to read doc', detail: await docRes.text() }, { status: 500 });
  }
  const doc = await docRes.json();
  const endIndex = doc.body.content[doc.body.content.length - 1].endIndex - 1;

  // 2. Build the new content
  const blocks = buildGapContent();

  // 3. Insert all text at the end of the document
  const requests = [];
  let currentIndex = endIndex;

  for (const block of blocks) {
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: block.text,
      },
    });

    const startIndex = currentIndex;

    if (block.style && block.style.startsWith('HEADING')) {
      requests.push({
        updateParagraphStyle: {
          range: { startIndex, endIndex: startIndex + block.text.split('\n')[0].length + 1 },
          paragraphStyle: { namedStyleType: block.style },
          fields: 'namedStyleType',
        },
      });
    }

    currentIndex += block.text.length;
  }

  // 4. Send batchUpdate
  const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${DOC_ID}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${docsToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!updateRes.ok) {
    return Response.json({ error: 'Failed to update doc', detail: await updateRes.text() }, { status: 500 });
  }

  return Response.json({ success: true, message: 'Part I appended successfully' });
});

function lines(items) {
  return items.map((line, i) => `☐ ${i + 1}. ${line}`).join('\n') + '\n\n';
}

function buildGapContent() {
  const blocks = [];

  blocks.push({ text: '\n\n', style: 'NORMAL_TEXT' });
  blocks.push({ text: 'חלק I — פערי אפיון: שדות, אוטומציות ומנגנונים שטרם מומשו\n', style: 'HEADING_1' });
  blocks.push({ text: 'סעיף זה מבוסס על השוואה בין מצגת האפיון (PRD) לבין המערכת הקיימת. כל פריט מסומן ☐ — יש לבדוק אם קיים במערכת או שנדרש פיתוח.\n\n', style: 'NORMAL_TEXT' });

  // I1: Stage-specific CRM fields gaps
  blocks.push({ text: 'I1: שדות CRM חסרים לפי שלבי האפיון\n', style: 'HEADING_2' });

  blocks.push({ text: 'שלב 02 — שיחת היכרות\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'שדה "רמת עניין (H/M/L)" — דירוג חום/קור של הליד — לא קיים ב-Client entity',
    'שדה "תקציב משוער" — הערכה ראשונית מהשיחה — לא קיים (קיים budget_range אבל לא סכום חופשי)',
    'שדה "דדליין משוער" — מתי הלקוח צריך סיום — לא קיים',
    'שדה "סיכום שיחה" — תיעוד נקודות עיקריות — נשמר כ-Communication אבל לא כשדה ייעודי',
  ]) });

  blocks.push({ text: 'שלב 05 — שאלון מפורט\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'שדה "קישור לתשובות שאלון" — לינק מלא לשאלון שמולא — לא קיים',
    'שדה "העדפות עיצוביות" — סגנון, צבעים, חומרים — קיים design_style אבל חלקי',
    'שדה "אילוצים" — מגבלות מבניות, תקציב קשיח — לא קיים',
    'שדה "חללים בפרויקט" — רשימת חדרים/אזורים — לא קיים',
    'שדה "מטרות הפרויקט" — חזון הלקוח — לא קיים',
    'שדה "דדליין לפרויקט" — תאריך כניסה רצוי — לא קיים (יש end_date_est אבל לא מאותו שלב)',
  ]) });

  blocks.push({ text: 'שלב 06 — פגישת תכנית + גאנט/תקציב\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'שדה "אבני דרך" — שלבים מרכזיים ודדליינים — לא קיים כ-entity',
    'שדה "בעלי תפקידים" — קבלנים/ספקים פוטנציאליים — לא קיים',
    'שדה "מסמכי Output" — קישורים לקבצים שנוצרו — נשמרים כ-Documents אבל לא כשדה ייעודי',
    'שדה "תקציב יעד" — מסגרת תקציבית מוסכמת — קיים total_budget אבל שאלה אם מנוהל נכון',
  ]) });

  blocks.push({ text: 'שלב 07 — תכניות עבודה\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'שדה "סוג תכנית" — חשמל / אינסטלציה / תאורה / מיזוג — לא קיים (Document.type לא תומך)',
    'שדה "גרסה תכנית" — V1, V2... — קיים version_number על Document אבל לא ספציפי לסוג',
    'שדה "סטטוס אישור תכנית" — טיוטה / בהמתנה / מאושר — לא קיים',
    'שדה "תאריך יעד לאישור" — דדליין ללקוח — לא קיים',
  ]) });

  blocks.push({ text: 'שלב 08 — קונספט עיצובי\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'שדה "לוחות השראה" — קישור לתיקיית תמונות — לא קיים',
    'שדה "קישורי רנדרים" — תוצרי AI להדמיה — לא קיים (נשמרים כ-Documents)',
    'שדה "סטטוס אישור חומרים" — גוונים, טקסטורות — לא קיים',
    'שדה "תיעוד החלטות" — סיכום פגישה ב-CRM — נשמר כ-Communication',
    'שדה "תאריך אישור קונספט" — אבן דרך — לא קיים',
  ]) });

  blocks.push({ text: 'שלב 09 — ימי קניות (פער גדול!)\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'שדה "מכסת ימים" — מספר ימי קניות בהסכם (ברירת מחדל 5) — לא קיים כלל',
    'שדה "סטטוס ניצול" — ימים שנוצלו / ימים שנותרו — לא קיים',
    'שדה "יומן רכישות" — רשימת ספקים וחנויות שבוקרו — לא קיים',
    'שדה "רשימת פריטים" — מוצרים שנרכשו + עלויות — לא קיים',
    'שדה "אסמכתאות" — קישור לקבלות / הזמנות — לא קיים',
    'מנגנון מכסה + מונה ימים — לא ממומש',
    'התראה כשנותר יום 1 — לא ממומשת',
    'הצעת Upsell לרכישת יום נוסף — לא ממומשת',
  ]) });

  blocks.push({ text: 'שלב 10 — תמחור קבלנים\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'שדה "רשימת ספקים" — פרטי קבלנים ואנשי מקצוע — לא קיים כ-entity',
    'שדה "סטטוס הצעה ספק" — נשלח / התקבל / בבחינה — לא קיים',
    'שדה "תוקף הצעה" — תאריך אחרון לאישור — לא קיים',
    'שדה "עלות ופירוט" — סכום כולל + הערות — לא קיים',
    'שדה "החלטת לקוח" — מאושר / נדחה / למשא ומתן — לא קיים',
    'טבלת השוואת הצעות ספקים — לא ממומשת',
  ]) });

  blocks.push({ text: 'שלב 11 — ביצוע בשטח + פיקוח\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'שדה "יומן ביקורים" — תיעוד תאריכים ומטרת ביקור — לא קיים',
    'שדה "רשימת ליקויים (Punch List)" — מעקב פתוח/סגור — לא קיים',
    'שדה "סטטוס תיקון" — בטיפול / הושלם / דורש בדיקה — לא קיים',
    'שדה "תיעוד ויזואלי" — תמונות לפני ואחרי — לא קיים (אפשר Documents)',
    'שדה "אחריות" — תעודות אחריות ותוקף — לא קיים',
    'הפקת דוח פיקוח אוטומטי (PDF) — לא ממומש',
  ]) });

  blocks.push({ text: 'שלב 12 — ימי התקנה\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'שדה "ספק" — שם הספק ופרטי קשר — לא קיים ברמת שלב',
    'שדה "תאריך התקנה" — יום ושעה מתואמים — לא קיים',
    'שדה "חלל/מיקום" — היכן מתבצעת ההתקנה — לא קיים',
    'שדה "סטטוס התקנה" — מתוכנן / בתהליך / הושלם — לא קיים',
    'שדה "הערות/חריגות" — בעיות שעלו — לא קיים',
    'סנכרון Google Calendar — לא ממומש',
  ]) });

  blocks.push({ text: 'שלב 13 — סיום ומסירה\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'שדה "צ\'קליסט מסירה" — רשימת סעיפים חיוניים — לא קיים',
    'שדה "אישורי לקוח" — חתימה על קבלת פרויקט — לא קיים',
    'שדה "לקחים" — הערות לשיפור — לא קיים',
    'שדה "נכסים לשיווק" — אישור שימוש בתמונות/המלצות — לא קיים',
    'יצירת תיקייה לשיווק אוטומטית — לא ממומש',
    'שליחת מכתב תודה אוטומטי — לא ממומש',
  ]) });

  // I2: Missing automations
  blocks.push({ text: 'I2: אוטומציות שמוזכרות באפיון וטרם מומשו\n', style: 'HEADING_2' });

  blocks.push({ text: 'שלב 01 — לידים\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'עדכון סטטוס ליד ל-"מילא שאלון" בעת סיום שאלון — לא ממומש',
    'תיוג אוטומטי של מקור ליד (UTM/Source) — חלקי (שדה source קיים, אוטומציה לא)',
  ]) });

  blocks.push({ text: 'שלב 02 — שיחת היכרות\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'שליחת לינק תיאום (Calendly) אוטומטי ללקוח — לא ממומש (cal.com webhook קיים אבל לא שליחה)',
    'עדכון יומן פגישות אוטומטי — לא ממומש',
    'יצירת כרטיס לקוח אוטומטי אם אושר המשך — לא ממומש (סטטוס ידני)',
    'פתיחת משימת "הכנת הצעת מחיר" אוטומטית — לא ממומש',
  ]) });

  blocks.push({ text: 'שלב 03 — הצעת מחיר\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'תזכורת תשלום אוטומטית לפני פגישה (250₪) — לא ממומש',
    'פתיחת משימת Follow-Up למשרד אחרי 48-72 שעות — חלקי (autoQuoteFollowup קיים)',
    'עדכון סטטוס ליד ל-"קיבל הצעה" — לא ממומש כאוטומציה',
  ]) });

  blocks.push({ text: 'שלב 04 — סגירת פרויקט\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'יצירת ספריות פרויקט ב-Drive/Cloud — לא ממומש',
    'שליחת הודעת "ברוכים הבאים" עם פרטי גישה — לא ממומש',
    'הזנת לוח שלבים ראשוני (Timeline) — לא ממומש',
  ]) });

  blocks.push({ text: 'שלב 05 — שאלון מפורט\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'קליטה אוטומטית של תשובות שאלון לכרטיס הלקוח — לא ממומש',
    'הפקת תקציר מנהלים אוטומטי (AI Summary) — לא ממומש',
    'שליחת אישור קבלה ללקוח עם תאריך הפגישה — לא ממומש',
  ]) });

  blocks.push({ text: 'שלב 06 — פגישת תכנית\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'יצירה אוטומטית של טבלת תקציב ראשונית — לא ממומש',
    'הקמת גאנט ראשוני מבוסס תאריך סיום — לא ממומש',
    'פתיחת משימות אוטומטית לפי אבני דרך — לא ממומש',
    'שליחת סיכום פגישה וקבצים ללקוח במייל — לא ממומש',
  ]) });

  blocks.push({ text: 'שלבים 07-08 — תכניות עבודה + קונספט\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'תזכורות אוטומטיות ללקוח לאישור תכניות — לא ממומש',
    'עדכון גאנט לפי סטטוס אישור תכנית — לא ממומש',
    'קליטת תמונות השראה ישירות מוואטסאפ לתיקייה — לא ממומש',
    'שמירת רנדרים בתיק לקוח וקישור אוטומטי — לא ממומש',
  ]) });

  blocks.push({ text: 'שלב 09 — ימי קניות\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'עדכון מונה ימים אוטומטי לאחר כל יום שטח — לא ממומש',
    'התראה חכמה כשנותר יום 1 או פחות — לא ממומש',
    'הצעה אוטומטית לרכישת יום נוסף (Upsell) — לא ממומש',
    'הטמעת רכישות בטבלת תקציב בזמן אמת — לא ממומש',
    'סיכום יום קניות נשלח ללקוח במייל/וואטסאפ — לא ממומש',
  ]) });

  blocks.push({ text: 'שלבים 10-12 — תמחור, ביצוע, התקנות\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'תזכורות אוטומטיות לספקים על הצעות שלא הגיעו — לא ממומש',
    'הפקת טבלת השוואה אוטומטית ללקוח — לא ממומש',
    'שליחת הודעת אישור/דחייה לספקים — לא ממומש',
    'עדכון גאנט לפי קצב התקדמות בשטח — לא ממומש',
    'הפקת סיכום דוח פיקוח אוטומטי (PDF) — לא ממומש',
    'התראות על חריגות בלוחות זמנים — לא ממומש',
    'סנכרון אוטומטי ליומן (Google Calendar) — לא ממומש',
  ]) });

  blocks.push({ text: 'שלב 13 — סיום\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'שליחת סקר שביעות רצון אוטומטי בסיום — לא ממומש',
    'יצירת "תיקייה לשיווק" עם תמונות והמלצות — לא ממומש',
    'ארכוב חכם של מסמכי הפרויקט — לא ממומש',
    'שליחת מכתב תודה וסיכום ללקוח — לא ממומש',
  ]) });

  // I3: Three core mechanisms
  blocks.push({ text: 'I3: 3 מנגנונים מרכזיים מהאפיון — טרם מומשו\n', style: 'HEADING_2' });

  blocks.push({ text: 'מנגנון 1: ניהול ימי קניות\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'מכסה מוגדרת (5 ימים ברירת מחדל) — שדה על Project — לא קיים',
    'דשבורד מונה ימים שנוצלו / נותרו — לא קיים',
    'תיעוד מלא: תאריך, מיקום, פריטים שנרכשו — לא קיים',
    'התראת חריגה כשמתקרבים לסיום המכסה — לא ממומש',
    'הצעה אוטומטית לרכישת ימים נוספים (Upsell) — לא ממומש',
  ]) });

  blocks.push({ text: 'מנגנון 2: מעקב תקציב רציף\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'עדכון אוטומטי של תקציב בכל שלב (פגישה → ביצוע → סיום) — לא ממומש',
    'תצוגה ויזואלית (ירוק/אדום) של תכנון מול ביצוע — לא ממומש',
    'התראה מיידית על חריגה מעל 10% מסעיף תקציבי — לא ממומש',
    'הפקת דוח סטטוס תקציב ללקוח בלחיצת כפתור — לא ממומש',
  ]) });

  blocks.push({ text: 'מנגנון 3: גאנט דינמי אוטומטי\n', style: 'HEADING_3' });
  blocks.push({ text: lines([
    'עדכון דינמי של גאנט לפי התקדמות בפועל — לא ממומש',
    'תלויות בין משימות (משימה A מתעכבת → B+C זזות) — לא ממומש',
    'התראות על צוואר בקבוק שעלול לעכב מסירה — לא ממומש',
    'תצוגה ויזואלית (Timeline) שקופה ללקוח ולספקים — לא ממומש',
  ]) });

  // Summary
  blocks.push({ text: 'I4: סיכום פערים — עדיפות לטיפול\n', style: 'HEADING_2' });
  blocks.push({ text:
    '• עדיפות גבוהה: שלב 09 (ימי קניות) — פער גדול, מנגנון שלם חסר\n' +
    '• עדיפות גבוהה: מנגנון תקציב רציף — ליבת הערך של המערכת\n' +
    '• עדיפות בינונית: שלבים 10-12 (ספקים, פיקוח, התקנות) — entities חדשים נדרשים\n' +
    '• עדיפות בינונית: שדות שלבים 05-08 — העשרת נתונים על Project\n' +
    '• עדיפות נמוכה: גאנט דינמי — מורכב, אפשר לדחות לפאזה 2\n' +
    '• עדיפות נמוכה: אוטומציות ספקים — תלוי בהחלטות עסקיות\n\n' +
    'הערה: חלק מהפערים הם שדות שניתן להוסיף ל-entities הקיימים, וחלק דורשים entities חדשים (למשל: Supplier, ShoppingDay, PunchListItem).\n',
    style: 'NORMAL_TEXT'
  });

  return blocks;
}