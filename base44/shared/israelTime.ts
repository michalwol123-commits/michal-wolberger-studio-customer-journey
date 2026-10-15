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

// Minutes Israel is ahead of UTC at a given instant (DST-aware, derived from Intl, never hard-coded).
function israelOffsetMinutes(at: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(at).map((p) => [p.type, p.value])
  );
  const hour = parts.hour === '24' ? 0 : Number(parts.hour);
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, hour, +parts.minute, +parts.second);
  return Math.round((asUtc - at.getTime()) / 60000);
}

// Israel wall-clock date "YYYY-MM-DD" + time "HH:mm" → UTC ISO string (what scheduled_at stores).
export function israelIso(dateYmd: string, hhmm: string): string {
  const naive = new Date(`${dateYmd}T${hhmm.padStart(5, '0')}:00Z`);
  const guess = new Date(naive.getTime() - israelOffsetMinutes(naive) * 60000);
  return new Date(naive.getTime() - israelOffsetMinutes(guess) * 60000).toISOString();
}

// "HH:mm" in Israel for a given instant.
export function formatIsraelTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('he-IL', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
}

const WEEKDAYS = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", 'שבת'];

function weekdayOf(ymd: string): string {
  return WEEKDAYS[new Date(`${ymd}T12:00:00Z`).getUTCDay()];
}

// Ready-made Israel time text, e.g. "יום ה' 22.10.2026 בשעה 12:30". Used as-is by the agent and in messages.
export function formatIsraelWhen(date: string | Date): string {
  const ymd = israelDateOf(date);
  const [y, m, d] = ymd.split('-');
  return `יום ${weekdayOf(ymd)} ${Number(d)}.${Number(m)}.${y} בשעה ${formatIsraelTime(date)}`;
}

// Current date and time in Israel, so the agent never has to work out "today" or "tomorrow" itself.
export function israelNowInfo() {
  const now = new Date();
  const today = israelToday();
  const tomorrow = israelToday(1);
  return {
    today,
    today_weekday: weekdayOf(today),
    tomorrow,
    tomorrow_weekday: weekdayOf(tomorrow),
    time: formatIsraelTime(now),
    text: `עכשיו בישראל: ${formatIsraelWhen(now)}`,
  };
}
