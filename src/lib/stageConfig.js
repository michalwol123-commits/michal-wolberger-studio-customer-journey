const STAGES = [
  { num: 1, key: 's1_status', label: 'יצירת קשר ראשוני', shortLabel: 'קשר ראשוני', icon: '📞', description: 'פנייה נכנסת והתנעת התהליך בצורה אוטומטית' },
  { num: 2, key: 's2_status', label: 'שיחת היכרות', shortLabel: 'שיחת היכרות', icon: '🤝', description: 'תיאום אוטומטי, שיחה טלפונית והחלטה על המשך' },
  { num: 3, key: 's3_status', label: 'פגישת הצעת מחיר', shortLabel: 'הצעת מחיר', icon: '💰', description: 'הצגת חבילות שירות ובחירת מסלול ליווי' },
  { num: 4, key: 's4_status', label: 'סגירת פרויקט', shortLabel: 'סגירת פרויקט', icon: '📋', description: 'חתימה על הסכם דיגיטלי ותשלום ראשון' },
  { num: 5, key: 's5_status', label: 'שאלון מפורט', shortLabel: 'שאלון מפורט', icon: '📝', description: 'איסוף מידע מעמיק לקראת תחילת התכנון' },
  { num: 6, key: 's6_status', label: 'תכנית העמדה', shortLabel: 'תכנית העמדה', icon: '🗺️', description: 'עיצוב תכנית העמדה לחלל, הצגתה ללקוח, אישור ושחרור לביצוע' },
  { num: 7, key: 's7_status', label: 'הכנה לביצוע', shortLabel: 'הכנה לביצוע', icon: '⚡', description: 'תכניות חשמל, אינסטלציה, תאורה ומיזוג — הכנה לביצוע בשטח' },
  { num: 8, key: 's8_status', label: 'קונספט עיצובי + רנדרים', shortLabel: 'קונספט עיצובי', icon: '🎨', description: 'יצירת השפה העיצובית עם מודבורד ורנדרים AI' },
  { num: 9, key: 's9_status', label: 'ימי קניות', shortLabel: 'ימי קניות', icon: '🛍️', description: 'ליווי אישי לרכישות, ניהול מכסת ימים ומעקב תקציבי בזמן אמת' },
  { num: 10, key: 's10_status', label: 'תמחור קבלנים/ספקים', shortLabel: 'תמחור קבלנים/ספקים', icon: '⚖️', description: 'קבלת הצעות מחיר, השוואה חכמה ובחירת אנשי מקצוע' },
  { num: 11, key: 's11_status', label: 'ביצוע בשטח + ימי פיקוח', shortLabel: 'ביצוע + פיקוח', icon: '🏗️', description: 'פיקוח צמוד על עבודות הקבלן, תיעוד ליקויים ווידוא ביצוע לפי התכניות' },
  { num: 12, key: 's12_status', label: 'ימי התקנה ותיאום ספקים', shortLabel: 'התקנה + ספקים', icon: '🔧', description: 'תיאום, ביצוע ובקרה על התקנות הגמר בפרויקט' },
  { num: 13, key: 's13_status', label: 'סיום פרויקט ומסירה', shortLabel: 'סיום ומסירה', icon: '🏠', description: '' },
];
export default STAGES;
export const TOTAL_STAGES = 13;
export const getStageByNum = (num) => STAGES.find(s => s.num === num);
export const getStageName = (num) => STAGES.find(s => s.num === num)?.label || `שלב ${num}`;