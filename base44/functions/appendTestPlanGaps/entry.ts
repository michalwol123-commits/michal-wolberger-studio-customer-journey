import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DOC_ID = '17LjmFDvDhy5lAIRVfMxGVk3wA-BakrymjzX76NKoXs0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledocs');

  // 1. Read doc to find Part I start
  const docRes = await fetch(`https://docs.googleapis.com/v1/documents/${DOC_ID}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!docRes.ok) {
    return Response.json({ error: 'Failed to read doc', detail: await docRes.text() }, { status: 500 });
  }
  const doc = await docRes.json();

  // Find "חלק I" heading and delete everything from there to end
  let partIStart = null;
  const docEnd = doc.body.content[doc.body.content.length - 1].endIndex - 1;

  for (const el of doc.body.content) {
    if (el.paragraph && el.paragraph.elements) {
      const text = el.paragraph.elements.map(e => e.textRun?.content || '').join('');
      if (text.includes('חלק I')) {
        // Start from the newline before this paragraph
        partIStart = el.startIndex;
        break;
      }
    }
  }

  const requests = [];

  // Delete old Part I if it exists
  if (partIStart && partIStart < docEnd) {
    requests.push({
      deleteContentRange: {
        range: { startIndex: partIStart, endIndex: docEnd },
      },
    });
  }

  // Determine insert index
  const insertAt = partIStart || docEnd;

  // Build new content
  const blocks = buildDevPlan();
  let currentIndex = insertAt;

  for (const block of blocks) {
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: block.text,
      },
    });

    if (block.style && block.style.startsWith('HEADING')) {
      const headingEnd = currentIndex + block.text.split('\n')[0].length + 1;
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: currentIndex, endIndex: headingEnd },
          paragraphStyle: { namedStyleType: block.style },
          fields: 'namedStyleType',
        },
      });
    }

    currentIndex += block.text.length;
  }

  // Execute
  const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${DOC_ID}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!updateRes.ok) {
    return Response.json({ error: 'Failed to update doc', detail: await updateRes.text() }, { status: 500 });
  }

  return Response.json({ success: true, message: 'Part I rewritten as dev plan' });
});

function buildDevPlan() {
  const blocks = [];
  const b = (text, style) => blocks.push({ text, style });

  b('\n', 'NORMAL_TEXT');
  b('חלק I — פערי אפיון: רשימת פיתוח והשלמות\n', 'HEADING_1');
  b('מסמך זה מפרט פערים שזוהו בין מצגת האפיון (PRD) למערכת הקיימת.\nכל פריט מסומן לפי סטטוס:\n🔧 = לפתח (אני יכול לבצע)\n❓ = דורש החלטה עסקית שלך\n📋 = פאזה 2 (מורכב, נדחה)\n✅ = הושלם\n\n', 'NORMAL_TEXT');

  // ============ I1: Fields ============
  b('I1: שדות CRM חסרים לפי שלב\n', 'HEADING_2');

  b('שלב 02 — שיחת היכרות\n', 'HEADING_3');
  b(
    '🔧 שדה "רמת עניין (H/M/L)" — דירוג חום ליד — להוסיף ל-Client\n' +
    '🔧 שדה "תקציב משוער" — סכום חופשי (לא range) — להוסיף ל-Client\n' +
    '🔧 שדה "דדליין משוער" — מתי הלקוח צריך סיום — להוסיף ל-Client\n' +
    '✅ שדה "סיכום שיחה" — נשמר כ-Communication (מספיק)\n\n', 'NORMAL_TEXT');

  b('שלב 05 — שאלון מפורט\n', 'HEADING_3');
  b(
    '🔧 שדה "קישור לתשובות שאלון" — להוסיף ל-Project\n' +
    '🔧 שדה "אילוצים" — מגבלות מבניות/תקציב — להוסיף ל-Project\n' +
    '🔧 שדה "חללים בפרויקט" — רשימת חדרים — להוסיף ל-Project\n' +
    '🔧 שדה "מטרות הפרויקט" — חזון הלקוח — להוסיף ל-Project\n' +
    '✅ שדה "העדפות עיצוביות" — קיים design_style על Client\n' +
    '✅ שדה "דדליין לפרויקט" — קיים end_date_est\n\n', 'NORMAL_TEXT');

  b('שלב 06 — פגישת תכנית + גאנט/תקציב\n', 'HEADING_3');
  b(
    '❓ שדה "אבני דרך" — האם ליצור entity Milestone או שדה JSON? (דורש החלטה)\n' +
    '❓ שדה "בעלי תפקידים" — האם ליצור entity Supplier? (דורש החלטה)\n' +
    '✅ שדה "מסמכי Output" — נשמרים כ-Documents\n' +
    '✅ שדה "תקציב יעד" — קיים total_budget\n\n', 'NORMAL_TEXT');

  b('שלב 07 — תכניות עבודה\n', 'HEADING_3');
  b(
    '🔧 שדה "סוג תכנית" — להרחיב Document.type (חשמל/אינסטלציה/תאורה/מיזוג)\n' +
    '🔧 שדה "סטטוס אישור תכנית" — להוסיף ל-Document\n' +
    '🔧 שדה "תאריך יעד לאישור" — להוסיף ל-Document\n' +
    '✅ שדה "גרסה תכנית" — קיים version_number\n\n', 'NORMAL_TEXT');

  b('שלב 08 — קונספט עיצובי\n', 'HEADING_3');
  b(
    '🔧 שדה "סטטוס אישור חומרים" — להוסיף ל-Project\n' +
    '🔧 שדה "תאריך אישור קונספט" — להוסיף ל-Project\n' +
    '✅ שדה "לוחות השראה" + "רנדרים" — נשמרים כ-Documents\n' +
    '✅ שדה "תיעוד החלטות" — נשמר כ-Communication\n\n', 'NORMAL_TEXT');

  b('שלב 09 — ימי קניות (פער גדול!)\n', 'HEADING_3');
  b(
    '❓ Entity חדש "ShoppingDay" — יומן ימי קניות, מכסה, מונה — דורש החלטה\n' +
    '🔧 שדה "מכסת ימי קניות" — להוסיף ל-Project (ברירת מחדל 5)\n' +
    '🔧 שדה "ימים שנוצלו" — להוסיף ל-Project\n' +
    '❓ רשימת פריטים שנרכשו — entity נפרד או שדה? דורש החלטה\n' +
    '📋 מנגנון Upsell ליום נוסף — פאזה 2\n\n', 'NORMAL_TEXT');

  b('שלב 10 — תמחור קבלנים\n', 'HEADING_3');
  b(
    '❓ Entity חדש "Supplier" — פרטי ספקים, הצעות, סטטוסים — דורש החלטה\n' +
    '❓ Entity חדש "SupplierQuote" — הצעות מחיר ספקים, השוואה — דורש החלטה\n' +
    '📋 טבלת השוואת הצעות ספקים — פאזה 2\n\n', 'NORMAL_TEXT');

  b('שלב 11 — ביצוע בשטח + פיקוח\n', 'HEADING_3');
  b(
    '❓ Entity חדש "SiteVisit" — יומן ביקורים, תיעוד — דורש החלטה\n' +
    '❓ Entity חדש "PunchListItem" — ליקויים, סטטוס תיקון — דורש החלטה\n' +
    '🔧 שדה "תיעוד ויזואלי" — ניתן לשמור כ-Documents type=photo\n' +
    '📋 הפקת דוח פיקוח PDF אוטומטי — פאזה 2\n\n', 'NORMAL_TEXT');

  b('שלב 12 — ימי התקנה\n', 'HEADING_3');
  b(
    '❓ Entity חדש "Installation" — ספק, תאריך, חלל, סטטוס — דורש החלטה\n' +
    '📋 סנכרון Google Calendar — פאזה 2\n\n', 'NORMAL_TEXT');

  b('שלב 13 — סיום ומסירה\n', 'HEADING_3');
  b(
    '🔧 שדה "צ\'קליסט מסירה" — להוסיף ל-Project כ-JSON\n' +
    '🔧 שדה "אישורי לקוח" — חתימה דיגיטלית — להוסיף ל-Project\n' +
    '🔧 שדה "לקחים" — להוסיף ל-Project\n' +
    '📋 יצירת תיקייה לשיווק אוטומטית — פאזה 2\n' +
    '📋 שליחת מכתב תודה אוטומטי — פאזה 2\n\n', 'NORMAL_TEXT');

  // ============ I2: Automations ============
  b('I2: אוטומציות חסרות — רשימת פיתוח\n', 'HEADING_2');

  b('שלבים 01-02\n', 'HEADING_3');
  b(
    '🔧 עדכון סטטוס ליד ל-"מילא שאלון" אוטומטית\n' +
    '🔧 תיוג אוטומטי של מקור ליד (UTM/Source)\n' +
    '🔧 פתיחת משימת "הכנת הצעת מחיר" אוטומטית בסיום שלב 2\n' +
    '📋 שליחת לינק תיאום Calendly אוטומטי — פאזה 2\n' +
    '📋 עדכון יומן פגישות אוטומטי — פאזה 2\n\n', 'NORMAL_TEXT');

  b('שלבים 03-04\n', 'HEADING_3');
  b(
    '🔧 תזכורת תשלום לפני פגישה (250₪)\n' +
    '✅ פתיחת Follow-Up אחרי 48-72 שעות — autoQuoteFollowup קיים\n' +
    '🔧 שליחת הודעת "ברוכים הבאים" בסגירת פרויקט\n' +
    '📋 יצירת ספריות Drive אוטומטית — פאזה 2\n' +
    '📋 הזנת Timeline ראשוני — פאזה 2\n\n', 'NORMAL_TEXT');

  b('שלבים 05-06\n', 'HEADING_3');
  b(
    '🔧 קליטת תשובות שאלון לכרטיס לקוח\n' +
    '🔧 שליחת אישור קבלה ללקוח עם תאריך פגישה\n' +
    '🔧 שליחת סיכום פגישה וקבצים ללקוח במייל\n' +
    '📋 הפקת סיכום מנהלים AI — פאזה 2\n' +
    '📋 הקמת גאנט ראשוני אוטומטי — פאזה 2\n' +
    '📋 יצירת טבלת תקציב ראשונית — פאזה 2\n\n', 'NORMAL_TEXT');

  b('שלבים 07-08\n', 'HEADING_3');
  b(
    '🔧 תזכורות אוטומטיות ללקוח לאישור תכניות\n' +
    '📋 עדכון גאנט לפי סטטוס אישור — פאזה 2\n' +
    '📋 קליטת תמונות מוואטסאפ לתיקייה — פאזה 2\n\n', 'NORMAL_TEXT');

  b('שלב 09 — ימי קניות\n', 'HEADING_3');
  b(
    '🔧 עדכון מונה ימים אוטומטי אחרי כל יום שטח\n' +
    '🔧 התראה כשנותר יום 1\n' +
    '📋 הצעת Upsell אוטומטית — פאזה 2\n' +
    '📋 סיכום יום קניות נשלח ללקוח — פאזה 2\n\n', 'NORMAL_TEXT');

  b('שלבים 10-12\n', 'HEADING_3');
  b(
    '📋 תזכורות אוטומטיות לספקים — פאזה 2\n' +
    '📋 טבלת השוואה אוטומטית — פאזה 2\n' +
    '📋 שליחת אישור/דחייה לספקים — פאזה 2\n' +
    '📋 עדכון גאנט לפי התקדמות — פאזה 2\n' +
    '📋 הפקת דוח פיקוח PDF — פאזה 2\n' +
    '📋 התראות חריגות לוחות זמנים — פאזה 2\n' +
    '📋 סנכרון Google Calendar — פאזה 2\n\n', 'NORMAL_TEXT');

  b('שלב 13 — סיום\n', 'HEADING_3');
  b(
    '🔧 שליחת סקר שביעות רצון אוטומטי\n' +
    '📋 יצירת תיקייה לשיווק — פאזה 2\n' +
    '📋 ארכוב חכם — פאזה 2\n' +
    '📋 שליחת מכתב תודה — פאזה 2\n\n', 'NORMAL_TEXT');

  // ============ I3: Mechanisms ============
  b('I3: 3 מנגנונים מרכזיים — טרם מומשו\n', 'HEADING_2');

  b('מנגנון 1: ניהול ימי קניות\n', 'HEADING_3');
  b(
    '🔧 מכסה מוגדרת (5 ימים ברירת מחדל) — שדה על Project\n' +
    '🔧 דשבורד מונה ימים שנוצלו / נותרו\n' +
    '❓ תיעוד מלא: תאריך, מיקום, פריטים — entity חדש? דורש החלטה\n' +
    '🔧 התראת חריגה כשמתקרבים לסיום\n' +
    '📋 הצעה אוטומטית ל-Upsell — פאזה 2\n\n', 'NORMAL_TEXT');

  b('מנגנון 2: מעקב תקציב רציף\n', 'HEADING_3');
  b(
    '📋 עדכון אוטומטי של תקציב בכל שלב — פאזה 2\n' +
    '📋 תצוגה ויזואלית ירוק/אדום תכנון מול ביצוע — פאזה 2\n' +
    '📋 התראה על חריגה מעל 10% — פאזה 2\n' +
    '📋 הפקת דוח תקציב ללקוח — פאזה 2\n\n', 'NORMAL_TEXT');

  b('מנגנון 3: גאנט דינמי\n', 'HEADING_3');
  b(
    '📋 עדכון דינמי לפי התקדמות בפועל — פאזה 2\n' +
    '📋 תלויות בין משימות — פאזה 2\n' +
    '📋 התראות צוואר בקבוק — פאזה 2\n' +
    '📋 תצוגת Timeline ללקוח — פאזה 2\n\n', 'NORMAL_TEXT');

  // ============ I4: Summary ============
  b('I4: סיכום ועדיפויות\n', 'HEADING_2');
  b(
    'סה"כ פריטים לפיתוח מיידי (🔧): ~25 פריטים — בעיקר שדות חדשים ואוטומציות\n' +
    'פריטים הדורשים החלטה שלך (❓): ~7 פריטים — בעיקר entities חדשים\n' +
    'פריטים לפאזה 2 (📋): ~30 פריטים — גאנט, תקציב, ספקים\n\n' +
    'סדר עבודה מוצע:\n' +
    '1. הוספת שדות ל-Client ול-Project (מהיר, שובר פערים רבים)\n' +
    '2. הרחבת Document entity (סוג תכנית, סטטוס אישור)\n' +
    '3. אוטומציות שלב 01-04 (תזכורות, הודעות, משימות)\n' +
    '4. מנגנון ימי קניות (אחרי שתחליטי על entity)\n' +
    '5. אוטומציות שלבים 05-09\n' +
    '6. פאזה 2 — גאנט, תקציב, ספקים\n',
    'NORMAL_TEXT');

  return blocks;
}