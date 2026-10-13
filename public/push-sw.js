// Push-only service worker: no cache, no offline.
const ICON = 'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/a5bd48ebe_logo.png/v1/fit/w_192,h_192/a5bd48ebe_logo.png';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { body: event.data ? event.data.text() : '' }; }
  const title = d.title || 'מיכל וולברגר — עדכון';
  event.waitUntil(self.registration.showNotification(title, {
    body: d.body || 'יש עדכון חדש במערכת',
    icon: ICON, badge: ICON, dir: 'rtl', lang: 'he',
    tag: d.tag || undefined,
    data: { url: d.url || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (new URL(w.url).origin === self.location.origin) {
        await w.focus();
        if ('navigate' in w) await w.navigate(url);
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
