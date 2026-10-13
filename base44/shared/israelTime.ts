// Unified Israel-time helpers for backend functions (runtime clock is UTC).
const TZ = 'Asia/Jerusalem';

// "YYYY-MM-DD" of today in Israel, optionally shifted by whole days.
export function israelToday(offsetDays = 0) {
  const base = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  if (!offsetDays) return base;
  const d = new Date(`${base}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// "YYYY-MM-DD" in Israel for a given instant.
export function israelDateOf(date) {
  return new Date(date).toLocaleDateString('en-CA', { timeZone: TZ });
}

// Date object whose getDate()/getMonth()/getFullYear() equal today's Israeli date.
export function israelTodayDate() {
  return new Date(`${israelToday()}T12:00:00Z`);
}

export function formatIsraelDate(date = new Date(), locale = 'he-IL') {
  return new Date(date).toLocaleDateString(locale, { timeZone: TZ });
}

export function formatIsraelDateTime(date = new Date(), locale = 'he-IL') {
  return new Date(date).toLocaleString(locale, { timeZone: TZ });
}