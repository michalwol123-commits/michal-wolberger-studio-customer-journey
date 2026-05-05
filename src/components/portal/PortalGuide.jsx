import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Eye, FileCheck, BarChart3, Calendar, Lock, HelpCircle } from 'lucide-react';

const sections = [
  {
    icon: Eye,
    color: 'bg-blue-100 text-blue-600',
    title: 'מה זה הפורטל?',
    content: `הפורטל הוא המרחב האישי שלך לצפייה במהלך הפרויקט.\n\nכאן תוכל/י לעקוב אחרי ההתקדמות, לצפות במסמכים שהוכנו עבורך, לאשר הצעות ומסמכים, ולראות את לוח הזמנים והתקציב.\n\nהפורטל נגיש דרך הקישור האישי שקיבלת — לא צריך שם משתמש וסיסמה.`
  },
  {
    icon: FileCheck,
    color: 'bg-green-100 text-green-600',
    title: 'מה אני יכול/ה לעשות בפורטל?',
    items: [
      { q: 'אישור הצעת מחיר', a: 'כשנשלחת לך הצעת מחיר, היא תופיע בפורטל. תוכל/י לקרוא את הפרטים וללחוץ "מאשר/ת" או "לא מתאים". אם את/ה דוחה — תוכל/י להוסיף הערה מדוע.' },
      { q: 'אישור מסמכים', a: 'מסמכים כמו תכניות, רנדרים וחוזים מופיעים עם כפתור "אישור" ו"דחייה". אישור המסמך מעדכן את הצוות שאפשר להמשיך לשלב הבא.' },
      { q: 'הוספת הערות', a: 'כשדוחים מסמך, אפשר להוסיף הערה עם הסיבה או שינוי מבוקש.' },
    ]
  },
  {
    icon: Eye,
    color: 'bg-purple-100 text-purple-600',
    title: 'מה אני רואה (צפייה בלבד)?',
    items: [
      { q: 'שלבי הפרויקט', a: 'רשימת 13 השלבים עם סימון איפה נמצא הפרויקט כרגע — שלבים שהושלמו מסומנים בירוק, השלב הנוכחי מודגש.' },
      { q: 'מסמכים', a: 'כל המסמכים שהצוות שיתף איתך — תכניות, רנדרים, הדמיות. אפשר להוריד ולצפות.' },
      { q: 'לוח זמנים (גאנט)', a: 'תרשים ויזואלי של אבני הדרך בפרויקט — תאריכי התחלה, סיום, ועיכובים.' },
      { q: 'מעקב תקציב', a: 'סיכום תקציבי — כמה תוכנן, כמה בוצע, וכמה נותר. ללא פירוט רווחיות.' },
    ]
  },
  {
    icon: Lock,
    color: 'bg-red-100 text-red-600',
    title: 'מה אני לא רואה?',
    content: `הפורטל מציג רק מידע שרלוונטי אליך. הדברים הבאים **לא** מוצגים:\n\n• הערות פנימיות של הצוות\n• משימות צוות\n• תקשורת מערכתית (לוגים, שגיאות)\n• מסמכים שסומנו כ"לא גלוי ללקוח"\n• נתוני רווחיות ועלויות ספקים`
  },
  {
    icon: Calendar,
    color: 'bg-amber-100 text-amber-600',
    title: 'תשלומים ופגישות',
    items: [
      { q: 'איך אני רואה את התשלומים?', a: 'בפורטל מופיעה רשימת אבני הדרך לתשלום — סכום, תאריך יעד, וסטטוס (ממתין/שולם). תשלום בפועל מתבצע מחוץ לפורטל.' },
      { q: 'פגישות', a: 'פגישות שנקבעו מופיעות עם תאריך, שעה, ומיקום. תזכורות נשלחות אוטומטית ביום ושעה לפני.' },
    ]
  },
  {
    icon: HelpCircle,
    color: 'bg-teal-100 text-teal-600',
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
    <div className="border-b border-border last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-3 text-right text-sm font-medium hover:text-primary transition-colors">
        <span>{q}</span>
        {open ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
      </button>
      {open && <p className="text-sm text-muted-foreground pb-3 whitespace-pre-line leading-relaxed">{a}</p>}
    </div>
  );
}

export default function PortalGuide() {
  return (
    <div className="max-w-2xl mx-auto space-y-4" dir="rtl">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold font-heading">מדריך שימוש בפורטל</h2>
        <p className="text-muted-foreground text-sm mt-1">כל מה שצריך לדעת על הפורטל האישי שלך</p>
      </div>

      {sections.map((section, i) => {
        const Icon = section.icon;
        return (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3 text-base">
                <div className={`p-2 rounded-lg ${section.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {section.content && (
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{section.content}</p>
              )}
              {section.items && (
                <div>
                  {section.items.map((item, j) => (
                    <AccordionItem key={j} q={item.q} a={item.a} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}