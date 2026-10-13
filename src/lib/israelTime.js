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