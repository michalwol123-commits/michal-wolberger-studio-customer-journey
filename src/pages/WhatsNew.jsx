import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ArtIcon from '@/components/portal/ArtIcon';
import '@/components/portal/portal-theme.css';

// "מה חדש" — explains the October 2026 changes to Michal, in the studio's design language.
const SECTIONS = [
  {
    icon: 'pen',
    label: 'סיכום פגישה',
    title: 'כותבים בעט, מקלידים או מצלמים דף',
    link: { to: '/meetings', text: 'למסך הפגישות' },
    app: [
      'בכל כרטיס פגישה יש עכשיו כפתור "סיכום".',
      'אפשר להקליד, להכתיב (מיקרופון במקלדת), או ללחוץ "לוח כתיבה בעט", לכתוב ביד וללחוץ "המרה לטקסט". אם כף היד נשענת על המסך, זה לא מצייר.',
      'דף מהמחברת? "צילום דף או תמונה", ואז "טקסט מהתמונות".',
      'הסיכום פנימי. רק את והסוכן רואים אותו.',
      'כדי לשתף את הלקוח: כותבים "סיכום ללקוח", לוחצים "מה יקרה?" ואז "אישור ושיתוף". הסיכום מופיע בפורטל, ואם רוצים נשלח גם בוואטסאפ ובמייל.',
    ],
    agent: ['סיכום פגישת פרוגרמה עם משה ודנית: ...', 'שולחת לך צילום של הדף מהפגישה עם משה ודנית', 'תנסח ממה שכתבתי סיכום קצר ללקוח'],
  },
  {
    icon: 'calendar',
    label: 'פגישות',
    title: 'שעון ישראל, וגמישות בסוגי הפגישות',
    link: { to: '/meetings', text: 'למסך הפגישות' },
    app: [
      'השעות מוצגות ונשמרות תמיד בשעון ישראל, גם אצל הסוכן.',
      'סוגי פגישה חדשים: "פרוגרמה" ו"אחר". לכל פגישה אפשר לתת שם משלה, למשל "פגישת סקיצות וחלופות".',
      'פגישה שכבר התקיימה ולא נרשמה? אפשר לתעד אותה, והלקוח לא יקבל הזמנה.',
      'הסוכן מראה לפני כל קביעה, הזזה או ביטול מה יקרה ומה ייצא ללקוח, ושואל אם לאשר.',
    ],
    agent: ['תקבע למשה ודנית פגישת פרוגרמה ביום חמישי ב-10:00', 'תזיז את הפגישה של משה ודנית ל-22.10 ב-12:30', 'תתעד שהייתה לי היום פגישה עם משה ודנית ב-12:30'],
  },
  {
    icon: 'path',
    label: 'שלבי הפרויקט',
    title: 'אפשר לדלג, לחזור ולהתקדם בלי חסימות',
    link: { to: '/projects', text: 'לפרויקטים' },
    app: [
      'בעמוד הפרויקט: לוחצים על שלב, ואז "דילוג לשלב הזה" או "חזרה לשלב הזה".',
      'חלון קטן מסביר בדיוק מה יקרה, ומאפשר לבחור אם השלב הנוכחי הושלם או דולג, ואם לשלוח ללקוח הודעה.',
      'הכפתור "קדמי לשלב הבא" כבר לא חסום. אם חסר משהו בצ\'קליסט, רק מופיעה הערה.',
      'אצל הלקוח בפורטל, שלב שדולג מופיע באפור עדין עם "לא נדרש בפרויקט שלכם", ואפשר לחזור אליו בכל רגע.',
    ],
    agent: ['תעביר את משה ודנית לשלב 8', 'תחזיר את משה ודנית לשלב 6, בלי הודעה ללקוח'],
  },
  {
    icon: 'palette',
    label: 'קונספט עיצובי',
    title: 'השראה, רנדרים ומודבורד בלחיצה אחת',
    link: { to: '/projects', text: 'לפרויקטים' },
    app: [
      'בראש כל עמוד פרויקט יש עכשיו "לוח השראה" ו"מודבורד", במקום לחפש בתוך השלבים.',
      'תמונות שנשלחות לסוכן נשמרות בלוח ההשראה, ולא גלויות ללקוח עד שאת אומרת "לפרסם".',
      'הסוכן יכול ליצור רנדר AI ולשמור אותו בלוח, ולשלוח לך קישור שפותח את המודבורד ישר.',
    ],
    agent: ['תשמור את התמונות האלה בלוח ההשראה של משה ודנית, לסלון', 'תכין רנדר של סלון בגווני אגוז ושמנת', 'תפתח לי מודבורד למשה ודנית'],
  },
];

function Phrase({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="w-full text-right px-4 py-3 text-sm transition-colors"
      style={{ border: '1px solid var(--p-line)', background: copied ? 'var(--p-olive-bg)' : 'var(--p-bg)', color: 'var(--p-text)' }}
    >
      "{text}"
      <span className="p-label mr-2" style={{ color: copied ? 'var(--p-olive)' : 'var(--p-accent)' }}>{copied ? 'הועתק' : 'העתקה'}</span>
    </button>
  );
}

export default function WhatsNew() {
  return (
    <div className="portal-theme -m-4 lg:-m-6 p-5 sm:p-10 min-h-full" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="flex items-center gap-5">
          <ArtIcon name="compass" size={72} />
          <div>
            <p className="p-label mb-1">אוקטובר 2026</p>
            <h1 className="p-display text-3xl sm:text-4xl">מה חדש במערכת</h1>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--p-meta)' }}>
              המערכת מתאימה את עצמה אלייך. כמעט הכל אפשר לעשות גם מהמסך וגם בוואטסאפ מול הסוכן, ולפני כל דבר שיוצא ללקוח הסוכן מראה לך מה יקרה ושואל.
            </p>
          </div>
        </header>

        {SECTIONS.map((s, i) => (
          <section key={s.label} className="p-card">
            <div className="p-6 flex items-center gap-4" style={{ borderBottom: '1px solid var(--p-line)' }}>
              <ArtIcon name={s.icon} size={56} floatDelay={i * 0.4} />
              <div className="flex-1">
                <p className="p-label mb-0.5">{s.label}</p>
                <h2 className="p-display text-xl">{s.title}</h2>
              </div>
              <Link to={s.link.to} className="p-label hidden sm:inline" style={{ color: 'var(--p-ink)' }}>{s.link.text} ←</Link>
            </div>
            <div className="p-6 grid gap-6 md:grid-cols-5">
              <div className="md:col-span-3">
                <p className="p-label mb-2">במסך</p>
                <ul className="space-y-2 text-sm leading-relaxed">
                  {s.app.map(t => (
                    <li key={t} className="flex gap-2"><span style={{ color: 'var(--p-accent)' }}>—</span><span>{t}</span></li>
                  ))}
                </ul>
              </div>
              <div className="md:col-span-2">
                <p className="p-label mb-2">לכתוב לסוכן בוואטסאפ</p>
                <div className="space-y-2">{s.agent.map(t => <Phrase key={t} text={t} />)}</div>
              </div>
            </div>
          </section>
        ))}

        <section className="p-card p-6 flex items-start gap-4" style={{ background: 'var(--p-bg2)' }}>
          <ArtIcon name="check" size={48} />
          <div className="text-sm leading-relaxed">
            <h2 className="p-display text-lg mb-1">כדאי לזכור</h2>
            <p>הסוכן לא שולח שום דבר ללקוח בלי שאמרת "כן". אם משהו לא ברור לו, הוא שואל. ואם הסוכן אומר שעה, זו תמיד שעה בשעון ישראל.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
