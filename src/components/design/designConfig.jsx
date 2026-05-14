// Design item configuration - categories and rooms

export const CATEGORY_CONFIG = {
  color: { label: 'צבע', icon: '🎨' },
  flooring: { label: 'ריצוף', icon: '🏠' },
  furniture: { label: 'ריהוט', icon: '🛋️' },
  lighting: { label: 'תאורה', icon: '💡' },
  textile: { label: 'טקסטיל', icon: '🪟' },
  carpentry: { label: 'נגרות', icon: '🪵' },
  accessories: { label: 'אביזרים', icon: '✨' },
  wallpaper: { label: 'טפט', icon: '🖼️' },
  plants: { label: 'צמחייה', icon: '🌿' },
  appliances: { label: 'מכשירים', icon: '⚙️' },
  other: { label: 'אחר', icon: '📦' },
};

export const STATUS_CONFIG = {
  planned: { label: 'מתוכנן', color: 'bg-muted text-muted-foreground' },
  decided: { label: 'הוחלט', color: 'bg-blue-50 text-blue-700' },
  ordered: { label: 'הוזמן', color: 'bg-amber-50 text-amber-700' },
  delivered: { label: 'סופק', color: 'bg-green-50 text-green-700' },
};

export const COMMON_ROOMS = [
  'סלון', 'מטבח', 'פינת אוכל', 'חדר שינה הורים', 'חדר שינה ילדים',
  'חדר רחצה', 'חדר רחצה הורים', 'כניסה', 'מדרגות', 'חוץ', 'מרפסת', 'כללי'
];

export const CATEGORIES = Object.keys(CATEGORY_CONFIG);