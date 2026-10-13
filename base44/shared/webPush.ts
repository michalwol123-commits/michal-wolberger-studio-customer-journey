import webpush from 'npm:web-push@3.6.7';

let ready = false;
function init() {
  if (ready) return;
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') || 'https://michal-design-flow.base44.app',
    Deno.env.get('VAPID_PUBLIC_KEY'),
    Deno.env.get('VAPID_PRIVATE_KEY'),
  );
  ready = true;
}

// Sends to the given subscriptions. Never throws. Returns number delivered.
export async function sendToSubs(sr, subs, payload) {
  init();
  let sent = 0;
  const body = JSON.stringify(payload);
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body,
        { TTL: 86400, urgency: 'high' },
      );
      sent++;
      await sr.entities.PushSubscription.update(s.id, { last_ok_at: new Date().toISOString() }).catch(() => {});
    } catch (e) {
      const code = e?.statusCode;
      console.error('push failed', code, String(e?.body || e?.message || '').slice(0, 200));
      if (code === 404 || code === 410) await sr.entities.PushSubscription.delete(s.id).catch(() => {});
    }
  }
  return sent;
}