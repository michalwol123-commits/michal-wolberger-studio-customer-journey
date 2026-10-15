// System timestamps (created_date etc.) are UTC but may arrive without a "Z" suffix.
// Treat a suffix-less value as UTC, then show it in Israel time.
const toDate = (value) => {
  const s = String(value);
  const hasZone = /Z$|[+-]\d{2}:?\d{2}$/.test(s);
  return new Date(hasZone || !s.includes('T') ? s : `${s}Z`);
};

export function formatIsraelDateTime(value, { year = true } = {}) {
  if (!value) return '';
  return toDate(value).toLocaleString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    day: '2-digit', month: '2-digit', ...(year ? { year: 'numeric' } : {}),
    hour: '2-digit', minute: '2-digit',
  });
}

const TZ = 'Asia/Jerusalem';

// Minutes Israel is ahead of UTC at a given instant (DST-aware, derived from Intl).
function israelOffsetMinutes(at) {
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

// A datetime-local value ("YYYY-MM-DDTHH:mm") typed as Israel time → UTC ISO.
// Does not depend on the time zone the device is set to.
export function israelIso(localValue) {
  if (!localValue) return undefined;
  const [ymd, hm] = localValue.split('T');
  const naive = new Date(`${ymd}T${(hm || '00:00').slice(0, 5)}:00Z`);
  const guess = new Date(naive.getTime() - israelOffsetMinutes(naive) * 60000);
  return new Date(naive.getTime() - israelOffsetMinutes(guess) * 60000).toISOString();
}

// UTC instant → "YYYY-MM-DDTHH:mm" in Israel, for pre-filling datetime-local inputs.
export function israelLocalInput(value) {
  if (!value) return '';
  const d = toDate(value);
  const ymd = d.toLocaleDateString('en-CA', { timeZone: TZ });
  const hm = d.toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
  return `${ymd}T${hm}`;
}

// "YYYY-MM-DD" of today in Israel.
export function israelToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

// "YYYY-MM-DD" in Israel for a given instant.
export function israelDateOf(value) {
  return toDate(value).toLocaleDateString('en-CA', { timeZone: TZ });
}

// "HH:mm" in Israel for a given instant.
export function formatIsraelTime(value) {
  if (!value) return '';
  return toDate(value).toLocaleTimeString('he-IL', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
}
