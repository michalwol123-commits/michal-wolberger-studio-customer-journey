import React, { useState } from 'react';
import ArtIcon from './ArtIcon';

const sections = [
  {
    art: 'home',
    title: 'מה זה הפורטל?',
    content: `הפורטל הוא המרחב האישי שלך לצפייה במהלך הפרויקט.\n\nכאן תוכל/י לעקוב אחרי ההתקדמות, לצפות במסמכים שהוכנו עבורך, לאשר הצעות ומסמכים, ולראות את לוח הזמנים והתקציב.\n\nהפורטל נגיש דרך הקישור האישי שקיבלת — לא צריך שם משתמש וסיסמה.`
  },
  {
    art: 'pen',
    title: 'מה אני יכול/ה לעשות בפורטל?',
    items: [
      { q: 'אישור הצעת מחיר', a: 'כשנשלחת לך הצעת מחיר, היא תופיע בפורטל. תוכל/י לקרוא את הפרטים וללחוץ "מאשר/ת" או "לא מתאים". אם את/ה דוחה — תוכל/י להוסיף הערה מדוע.' },
      { q: 'אישור מסמכים', a: 'מסמכים כמו תכניות, רנדרים וחוזים מופיעים עם כפתור "אישור" ו"דחייה". אישור המסמך מעדכן את הצוות שאפשר להמשיך לשלב הבא.' },
      { q: 'הוספת הערות', a: 'כשדוחים מסמך, אפשר להוסיף הערה עם הסיבה או שינוי מבוקש.' },
    ]
  },
  {
    art: 'compass',
    title: 'מה אני רואה (צפייה בלבד)?',
    items: [
      { q: 'שלבי הפרויקט', a: 'רשימת 13 השלבים עם סימון איפה נמצא הפרויקט כרגע — שלבים שהושלמו מסומנים, והשלב הנוכחי מודגש.' },
      { q: 'מסמכים', a: 'כל המסמכים שהצוות שיתף איתך — תכניות, רנדרים, הדמיות. אפשר להוריד ולצפות.' },
      { q: 'לוח זמנים (גאנט)', a: 'תרשים ויזואלי של אבני הדרך בפרויקט — תאריכי התחלה, סיום, ועיכובים.' },
      { q: 'מעקב תקציב', a: 'סיכום תקציבי — כמה תוכנן, כמה בוצע, וכמה נותר. ללא פירוט רווחיות.' },
    ]
  },
  {
    art: 'doc',
    title: 'מה אני לא רואה?',
    content: `הפורטל מציג רק מידע שרלוונטי אליך. הדברים הבאים **לא** מוצגים:\n\n• הערות פנימיות של הצוות\n• משימות צוות\n• תקשורת מערכתית (לוגים, שגיאות)\n• מסמכים שסומנו כ"לא גלוי ללקוח"\n• נתוני רווחיות ועלויות ספקים`
  },
  {
    art: 'coin',
    title: 'תשלומים ופגישות',
    items: [
      { q: 'איך אני רואה את התשלומים?', a: 'בפורטל מופיעה רשימת אבני הדרך לתשלום — סכום, תאריך יעד, וסטטוס (ממתין/שולם). תשלום בפועל מתבצע מחוץ לפורטל.' },
      { q: 'פגישות', a: 'פגישות שנקבעו מופיעות עם תאריך, שעה, ומיקום. תזכורות נשלחות אוטומטית ביום ושעה לפני.' },
    ]
  },
  {
    art: 'chat',
    title: 'שאלות נפוצות',
    items: [
      { q: 'הקישור לא עובד — מה לעשות?', a: 'לפעמים קישור ישן פג תוקף. פני/ה למעצבת ובקשי קישור חדש — זה לוקח שניות.' },
      { q: 'אני לא רואה מסמך שדיברנו עליו', a: 'יכול להיות שהמסמך עדיין בהכנה או שטרם שותף איתך. צרי/צור קשר עם הצוות.' },
      { q: 'אישרתי בטעות — אפשר לבטל?', a: 'פני/ה ישירות למעצבת — היא יכולה לעדכן מצד המערכת.' },
      { q: 'האם מישהו אחר יכול להיכנס עם הקישור שלי?', a: 'הקישור אישי ומאובטח. כדאי לא לשתף אותו עם אנשים אחרים.' },
      { q: 'מתי הפורטל מתעדכן?', a: 'כל שינוי שהצוות עושה מופיע מיידית בפורטל שלך — אין צורך לרענן.' },
    ]
  },
];

function AccordionItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid #e8e0d8' }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-3.5 text-right text-sm transition-colors group">
        <span style={{ color: '#2a1f18' }}>{q}</span>
        <span className="shrink-0 text-xs transition-transform" style={{ color: '#8a7060', transform: open ? 'rotate(90deg)' : 'none' }}>←</span>
      </button>
      {open && <p className="text-sm pb-4 whitespace-pre-line leading-relaxed" style={{ color: '#8a7060' }}>{a}</p>}
    </div>
  );
}

export default function PortalGuide() {
  return (
    <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
      <div className="text-center mb-10">
        <p className="p-label mb-2">כל מה שצריך לדעת</p>
        <h2 className="p-display text-3xl md:text-4xl" style={{ fontWeight: 300 }}>מדריך שימוש בפורטל</h2>
      </div>

      {sections.map((section, i) => (
        <div key={i} className="p-card">
          <div className="p-6 flex items-center gap-4" style={{ borderBottom: '1px solid #e8e0d8' }}>
            <ArtIcon name={section.art} size={52} floatDelay={i} />
            <h3 className="p-display text-lg">{section.title}</h3>
          </div>
          <div className="px-6 py-5">
            {section.content && (
              <p className="text-sm whitespace-pre-line leading-relaxed" style={{ color: '#4a3728' }}>{section.content}</p>
            )}
            {section.items && (
              <div>
                {section.items.map((item, j) => (
                  <AccordionItem key={j} q={item.q} a={item.a} />
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}