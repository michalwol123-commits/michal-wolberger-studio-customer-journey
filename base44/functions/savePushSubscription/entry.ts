import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const { subscription, user_agent } = await req.json();
  const endpoint = subscription?.endpoint;
  const keys = subscription?.keys || {};
  if (typeof endpoint !== 'string' || !endpoint.startsWith('https://') || !keys.p256dh || !keys.auth) {
    return Response.json({ error: 'invalid subscription' }, { status: 400 });
  }
  // entities.upsert does not exist in @base44/sdk@0.8.25 — filter, then update or create.
  const data = { endpoint, p256dh: keys.p256dh, auth: keys.auth, user_email: user.email, user_agent: String(user_agent || '').slice(0, 300) };
  const sr = base44.asServiceRole;
  const [existing] = await sr.entities.PushSubscription.filter({ endpoint });
  if (existing) await sr.entities.PushSubscription.update(existing.id, data);
  else await sr.entities.PushSubscription.create(data);
  return Response.json({ ok: true });
});
