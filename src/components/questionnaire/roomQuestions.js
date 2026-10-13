// Extra spaces for the detailed (stage 5) questionnaire.
// Field types: text | textarea | radio (single choice) | checks (multi choice)
const common = (id) => [
  { id: `${id}_existing`, type: 'textarea', label: 'רהיטים או פריטים קיימים שנשארים בחלל הזה', placeholder: 'מה עובר איתכם? מה הולך?' },
  { id: `${id}_notes`, type: 'textarea', label: 'הערות נוספות', placeholder: 'משהו נוסף שחשוב לכם?' },
];

export const ROOMS = [
  {
    id: 'kitchen', title: 'מטבח', fields: [
      { id: 'kitchen_cook_freq', type: 'radio', label: 'באיזו תדירות מבשלים?', options: ['כל יום', 'כמה פעמים בשבוע', 'בעיקר בסופ״ש', 'כמעט לא'] },
      { id: 'kitchen_cooks', type: 'text', label: 'כמה אנשים מבשלים במקביל?', placeholder: 'לדוגמה: 2' },
      { id: 'kitchen_layout', type: 'radio', label: 'צורת מטבח מועדפת', options: ['קיר אחד', 'צורת ר', 'צורת ח', 'עם אי', 'לא יודעים'] },
      { id: 'kitchen_island', type: 'checks', label: 'מה חשוב באי / בפינת ישיבה?', options: ['ישיבה לארוחת בוקר', 'כיור באי', 'כיריים באי', 'אחסון באי', 'מקום להכנת עבודות לילדים'] },
      { id: 'kitchen_appliances', type: 'checks', label: 'מכשירים שצריכים מקום', options: ['מדיח', 'מקרר כפול / מקרר מקפיא נפרד', 'תנור כפול', 'מיקרוגל בילט אין', 'מכונת קפה', 'מקרר יין', 'מקפיא נוסף', 'מערכת מים / בר מים', 'פלטה / מיחם שבת'] },
      { id: 'kitchen_counter', type: 'textarea', label: 'מכשירים שעומדים על השיש באופן קבוע', placeholder: 'לדוגמה: טוסטר, מיקסר, מכונת לחם...' },
      { id: 'kitchen_kosher', type: 'radio', label: 'כשרות במטבח', options: ['לא רלוונטי', 'כיור כפול', 'כיור כפול + אזורי עבודה נפרדים', 'מטבח פסח / אחסון לפסח'] },
      { id: 'kitchen_storage', type: 'checks', label: 'צורכי אחסון', options: ['מזווה', 'מגירות עמוקות לסירים', 'אחסון לכלים חגיגיים', 'אחסון למוצרים יבשים', 'פח מיחזור מובנה', 'מדפים פתוחים'] },
      { id: 'kitchen_finish', type: 'textarea', label: 'חומרים וגימורים שאוהבים (חזיתות, משטח, ידיות)', placeholder: 'לדוגמה: עץ, אבן בהירה, בלי ידיות...' },
      ...common('kitchen'),
    ],
  },
  {
    id: 'master', title: 'חדר שינה הורים', fields: [
      { id: 'master_bed', type: 'radio', label: 'גודל מיטה', options: ['140', '160', '180', '200', 'לא יודעים'] },
      { id: 'master_closet', type: 'radio', label: 'אחסון בגדים', options: ['ארון קיר', 'חדר ארונות / ארון פתוח', 'ארון קיים', 'לא יודעים'] },
      { id: 'master_items', type: 'checks', label: 'מה חשוב שיהיה בחדר?', options: ['טלוויזיה', 'פינת איפור / שולחן טואלט', 'שולחן עבודה', 'פינת ישיבה / כורסה', 'מראה גדולה', 'שידות לילה', 'מקום לעריסה'] },
      { id: 'master_light', type: 'radio', label: 'אור וחושך', options: ['אוהבים חושך מלא (האפלה)', 'אוהבים אור טבעי', 'שילוב'] },
      { id: 'master_sides', type: 'textarea', label: 'הרגלים מיוחדים (קריאה במיטה, מי קם מוקדם, מזגן...)', placeholder: '' },
      ...common('master'),
    ],
  },
  {
    id: 'kids', title: 'חדרי ילדים', fields: [
      { id: 'kids_details', type: 'textarea', label: 'לכל ילד: שם, גיל ותחומי עניין', placeholder: 'לדוגמה: נועה (8) — אוהבת לצייר וחיות; יואב (12) — כדורגל ומחשב' },
      { id: 'kids_sharing', type: 'radio', label: 'חלוקת חדרים', options: ['כל ילד בחדר משלו', 'ילדים חולקים חדר', 'שילוב'] },
      { id: 'kids_bed', type: 'checks', label: 'סוג מיטה', options: ['מיטה רגילה', 'מיטה כפולה / קומותיים', 'מיטה נפתחת לאירוח', 'מיטה עם מגירות', 'מיטת תינוק'] },
      { id: 'kids_items', type: 'checks', label: 'מה צריך להיות בחדר?', options: ['פינת לימוד', 'עמדת מחשב / גיימינג', 'אחסון למשחקים', 'פינת קריאה', 'מקום ליצירה', 'מדפי תצוגה'] },
      { id: 'kids_growth', type: 'radio', label: 'עיצוב לטווח', options: ['שיתאים לגיל הנוכחי', 'שיגדל עם הילד', 'לא בטוחים'] },
      { id: 'kids_style', type: 'textarea', label: 'צבעים, נושאים או בקשות של הילדים עצמם', placeholder: '' },
      ...common('kids'),
    ],
  },
  {
    id: 'bath', title: 'חדרי רחצה ושירותים', fields: [
      { id: 'bath_count', type: 'text', label: 'כמה חדרי רחצה / שירותים בפרויקט?', placeholder: 'לדוגמה: 2 חדרי רחצה + שירותי אורחים' },
      { id: 'bath_type', type: 'checks', label: 'מה מעדיפים?', options: ['מקלחון', 'אמבטיה', 'אמבטיה + מקלחון נפרד', 'מקלחת פתוחה (walk-in)'] },
      { id: 'bath_sink', type: 'radio', label: 'כיור בחדר ההורים', options: ['יחיד', 'כפול', 'לא רלוונטי'] },
      { id: 'bath_items', type: 'checks', label: 'פריטים חשובים', options: ['אסלה תלויה', 'בידה / מקלחון לאסלה', 'נישה במקלחת', 'מראה עם תאורה', 'חימום רצפה / מגבות', 'מקום למכונת כביסה'] },
      { id: 'bath_storage', type: 'textarea', label: 'צורכי אחסון (מגבות, מוצרי טיפוח, ניקיון)', placeholder: '' },
      { id: 'bath_issues', type: 'textarea', label: 'בעיות קיימות (אוורור, רטיבות, לחץ מים...)', placeholder: '' },
      ...common('bath'),
    ],
  },
  {
    id: 'entry', title: 'כניסה', fields: [
      { id: 'entry_items', type: 'checks', label: 'מה צריך בכניסה?', options: ['ארון נעליים', 'מתלה מעילים', 'ספסל', 'מראה', 'מקום למפתחות ודואר', 'מקום לעגלה / אופניים', 'מקום לתיקים של הילדים'] },
      { id: 'entry_shoes', type: 'text', label: 'כמה זוגות נעליים בערך צריך לאחסן?', placeholder: '' },
      { id: 'entry_feel', type: 'textarea', label: 'איזו תחושה הכניסה צריכה ליצור?', placeholder: 'לדוגמה: מזמינה, מסודרת, מרשימה...' },
      ...common('entry'),
    ],
  },
  {
    id: 'office', title: 'חדר עבודה / משרד ביתי', fields: [
      { id: 'office_people', type: 'text', label: 'כמה עובדים מהבית ובאיזו תדירות?', placeholder: '' },
      { id: 'office_items', type: 'checks', label: 'מה חשוב?', options: ['שקט / בידוד אקוסטי', 'רקע לזום', 'שני מסכים', 'אחסון מסמכים', 'מדפסת', 'פינת ישיבה לאורחים', 'מיטה לאירוח'] },
      { id: 'office_desk', type: 'radio', label: 'סוג שולחן', options: ['שולחן רגיל', 'שולחן מתכוונן (עמידה)', 'נגרות מובנית', 'לא יודעים'] },
      ...common('office'),
    ],
  },
  {
    id: 'laundry', title: 'חדר כביסה / שירות', fields: [
      { id: 'laundry_machines', type: 'radio', label: 'סידור מכונות', options: ['זו על גבי זו', 'זו ליד זו', 'רק מכונת כביסה'] },
      { id: 'laundry_items', type: 'checks', label: 'מה צריך?', options: ['מקום לייבוש תלייה', 'משטח קיפול', 'מקום לגיהוץ', 'כיור שירות', 'אחסון חומרי ניקיון', 'מקום לשואב / מטאטא'] },
      ...common('laundry'),
    ],
  },
  {
    id: 'safe_room', title: 'ממ״ד / חדר אורחים', fields: [
      { id: 'safe_use', type: 'checks', label: 'למה החדר משמש בפועל?', options: ['חדר אורחים', 'חדר עבודה', 'חדר משחקים', 'חדר ילד', 'מחסן', 'חדר כושר'] },
      { id: 'safe_items', type: 'checks', label: 'מה צריך להיות בחדר?', options: ['מיטה / ספה נפתחת', 'ארון', 'שולחן', 'טלוויזיה', 'אחסון למים וציוד חירום'] },
      ...common('safe_room'),
    ],
  },
  {
    id: 'outdoor', title: 'מרפסת / גינה', fields: [
      { id: 'outdoor_use', type: 'checks', label: 'איך תשתמשו בחוץ?', options: ['פינת ישיבה', 'פינת אוכל', 'מנגל / מטבח חוץ', 'משחקי ילדים', 'סוכה', 'ג׳קוזי / בריכה', 'פינת קפה בוקר'] },
      { id: 'outdoor_plants', type: 'radio', label: 'צמחייה', options: ['הרבה צמחייה', 'מעט ופשוט לתחזוקה', 'בלי צמחייה'] },
      { id: 'outdoor_shade', type: 'radio', label: 'הצללה', options: ['קיימת', 'צריך פרגולה / סוכך', 'לא צריך'] },
      { id: 'outdoor_notes_extra', type: 'textarea', label: 'תאורה, פרטיות, שכנים, רוח או שמש', placeholder: '' },
      ...common('outdoor'),
    ],
  },
  {
    id: 'pets_access', title: 'חיות מחמד ונגישות', fields: [
      { id: 'pets', type: 'textarea', label: 'חיות מחמד בבית (סוג, גודל, צרכים מיוחדים)', placeholder: 'לדוגמה: כלב גדול — צריך מקום לקערות ומיטה, ריפוד עמיד' },
      { id: 'access', type: 'textarea', label: 'צורכי נגישות או התאמות (הורים מבוגרים, מוגבלות, תינוקות)', placeholder: '' },
      ...common('pets_access'),
    ],
  },
];

const LEGACY_FIELDS = {
  living: ['living_items', 'living_items_other', 'tv_size', 'accent_wall', 'seating_type', 'seating_other', 'existing_furniture', 'living_notes'],
  dining: ['dining_items', 'dining_items_other', 'table_seats', 'hosting_style', 'dining_notes'],
};

export const ALL_SPACES = [{ id: 'living', title: 'סלון' }, { id: 'dining', title: 'פינת אוכל' }, ...ROOMS];

export const spaceFieldIds = (id) =>
  LEGACY_FIELDS[id] || (ROOMS.find(r => r.id === id)?.fields.map(f => f.id) ?? []);

// living/dining shown in results: always for older questionnaires, otherwise only if selected
export const showLegacySpace = (r, id) => !r.spaces_v2 || (r.selected_rooms || []).includes(id);

// rows for result views: [{ title, rows: [{label, value}] }]
export function getRoomSections(r) {
  const selected = r.selected_rooms || [];
  return ROOMS.filter(room => selected.includes(room.id)).map(room => ({
    title: room.title,
    rows: room.fields
      .map(f => ({ label: f.label, value: Array.isArray(r[f.id]) ? r[f.id].join(', ') : r[f.id] }))
      .filter(x => x.value),
  })).filter(s => s.rows.length);
}