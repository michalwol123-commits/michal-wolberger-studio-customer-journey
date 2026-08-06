import React from 'react';

// אייקוני קו-אחד מופשטים בעיגול בז' עם מסגרת חומה — שפת האיורים של הסטודיו.
// stroke דק (1.3), בלי מילוי, בלי ספריות אייקונים מוכנות.

const ART = {
  // שעון מעורר — פגישות וזמנים
  clock: (<><circle cx="26" cy="30" r="16" /><line x1="26" y1="20" x2="26" y2="30" /><line x1="26" y1="30" x2="34" y2="30" />
    <line x1="12" y1="18" x2="8" y2="12" /><line x1="8" y1="12" x2="12" y2="8" />
    <line x1="40" y1="18" x2="44" y2="12" /><line x1="44" y1="12" x2="40" y2="8" />
    <line x1="20" y1="46" x2="18" y2="50" /><line x1="32" y1="46" x2="34" y2="50" /></>),
  // מטבע/₪ — תשלומים ותקציב
  coin: (<><line x1="26" y1="8" x2="26" y2="44" />
    <path d="M36,16 C36,12 30,10 26,12 C22,14 16,16 18,22 C20,28 32,26 34,32 C36,38 30,42 26,40 C22,38 16,36 16,32" /></>),
  // סרגל משולש — תכנון ושרטוטים
  ruler: (<><polygon points="6,46 46,46 6,6" />
    <line x1="14" y1="46" x2="14" y2="42" /><line x1="22" y1="46" x2="22" y2="42" />
    <line x1="30" y1="46" x2="30" y2="42" /><line x1="38" y1="46" x2="38" y2="42" />
    <line x1="6" y1="14" x2="10" y2="14" /><line x1="6" y1="22" x2="10" y2="22" />
    <line x1="6" y1="30" x2="10" y2="30" /><line x1="6" y1="38" x2="10" y2="38" /></>),
  // מסמך — הצעות, חוזים ואישורים
  doc: (<><path d="M14 8h18l10 10v26a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z" /><path d="M32 8v10h10" />
    <line x1="19" y1="26" x2="35" y2="26" /><line x1="19" y1="32" x2="31" y2="32" /><line x1="19" y1="38" x2="27" y2="38" /></>),
  // מסלול עם דגל — מהלך הפרויקט
  path: (<><path d="M8 44c10-3 9-15 18-18s12-9 20-12" strokeDasharray="0.5 6" /><circle cx="10" cy="43" r="3.5" />
    <line x1="42" y1="14" x2="42" y2="6" /><path d="M42 6l9 3.5-9 3.5" /></>),
  // בועת שיחה — הערות ותקשורת
  chat: (<><path d="M45 24a19 19 0 0 1-27.5 17L7 44l3.3-10.2A19 19 0 1 1 45 24Z" />
    <line x1="18" y1="24" x2="18.01" y2="24" /><line x1="26" y1="24" x2="26.01" y2="24" /><line x1="34" y1="24" x2="34.01" y2="24" /></>),
  // וי בעיגול — שלב שהושלם
  check: (<><circle cx="26" cy="26" r="18" /><path d="M17 26.5l6 6 12-13" /></>),
  // מצפן — אפיון, השראה והכוונה
  compass: (<><circle cx="26" cy="26" r="19" /><circle cx="26" cy="26" r="1.6" />
    <path d="M33.5 18.5l-4.2 10.8-10.8 4.2 4.2-10.8z" />
    <line x1="26" y1="4" x2="26" y2="8" /><line x1="26" y1="44" x2="26" y2="48" />
    <line x1="4" y1="26" x2="8" y2="26" /><line x1="44" y1="26" x2="48" y2="26" /></>),
  // יד מנופפת — ברכה
  wave: (<><path d="M20 40V16a3 3 0 0 1 6 0v10" /><path d="M26 26V13a3 3 0 0 1 6 0v13" />
    <path d="M32 26v-8a3 3 0 0 1 6 0v14c0 8-5 13-12 13s-12-5-12-12v-6a3 3 0 0 1 6 0" /></>),
  // בית — הפרויקט
  home: (<><path d="M8 24 26 8l18 16" /><path d="M12 22v22h28V22" /><rect x="21" y="30" width="10" height="14" /></>),
  // גאנט — לוח זמנים
  gantt: (<><line x1="10" y1="8" x2="10" y2="44" /><line x1="10" y1="44" x2="46" y2="44" />
    <rect x="14" y="12" width="18" height="6" /><rect x="20" y="23" width="22" height="6" /><rect x="26" y="34" width="14" height="6" /></>),
  // עט — חתימה דיגיטלית
  pen: (<><path d="M12 40l3-9L36 10a4.2 4.2 0 0 1 6 6L21 37l-9 3z" /><line x1="31" y1="15" x2="37" y2="21" />
    <path d="M10 46c6-2.5 20-2.5 30 0" /></>),
  // מצלמה — ביקורי שטח ותמונות
  camera: (<><rect x="7" y="16" width="38" height="27" /><path d="M18 16l4-6h8l4 6" /><circle cx="26" cy="29" r="8" />
    <line x1="39" y1="22" x2="39.01" y2="22" /></>),
  // חבילה — ספקים והזמנות
  box: (<><path d="M8 17 26 7l18 10v18L26 45 8 35z" /><path d="M8 17l18 10 18-10" /><line x1="26" y1="27" x2="26" y2="45" /></>),
  // לב — לוח השראה
  heart: (<><path d="M26 44C14.5 34.5 8 27.5 8 19.5a9 9 0 0 1 18-1.5 9 9 0 0 1 18 1.5c0 8-6.5 15-18 24.5z" /></>),
  // פלטת צבעים — עיצוב וקונספט
  palette: (<><path d="M26 8a18 18 0 1 0 0 36c3 0 4.2-2 3.2-4.2-1.4-3 .3-5.8 4-5.8h3.6c4.2 0 7.2-3.4 7.2-8A18 18 0 0 0 26 8z" />
    <circle cx="17" cy="20" r="1.5" /><circle cx="26" cy="15" r="1.5" /><circle cx="35" cy="20" r="1.5" /><circle cx="15.5" cy="30" r="1.5" /></>),
  // לוח שנה — תיאום פגישה
  calendar: (<><rect x="8" y="12" width="36" height="32" /><line x1="8" y1="22" x2="44" y2="22" />
    <line x1="17" y1="8" x2="17" y2="16" /><line x1="35" y1="8" x2="35" y2="16" />
    <line x1="17" y1="31" x2="17.01" y2="31" /><line x1="26" y1="31" x2="26.01" y2="31" /><line x1="35" y1="31" x2="35.01" y2="31" />
    <line x1="17" y1="38" x2="17.01" y2="38" /><line x1="26" y1="38" x2="26.01" y2="38" /></>),
  // שאלון — רשימת שאלות
  list: (<><rect x="10" y="8" width="32" height="38" /><path d="M16 18l2.5 2.5 5-5" /><line x1="28" y1="18" x2="36" y2="18" />
    <path d="M16 29l2.5 2.5 5-5" /><line x1="28" y1="29" x2="36" y2="29" />
    <circle cx="18.5" cy="39" r="2.8" /><line x1="28" y1="39" x2="36" y2="39" /></>),
};

export default function ArtIcon({ name, size = 64, floatDelay = 0 }) {
  const inner = Math.round(size * 0.5);
  return (
    <div className="relative flex items-center justify-center shrink-0 group" style={{ width: size, height: size }}>
      {/* טבעת פעימה — מופיעה ב-hover */}
      <div
        style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '1px solid rgba(74,55,40,0.4)', animation: 'pulseRing 1.8s ease-out infinite', opacity: 0,
        }}
        className="group-hover:opacity-100 transition-opacity"
      />
      {/* העיגול המרחף */}
      <div
        className="portal-art-circle rounded-full flex items-center justify-center transition-shadow"
        style={{ width: size, height: size, animation: `floatY ${5 + floatDelay}s ease-in-out infinite` }}
      >
        <svg width={inner} height={inner} viewBox="0 0 52 52" fill="none"
          stroke="#4a3728" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {ART[name] || ART.home}
        </svg>
      </div>
    </div>
  );
}