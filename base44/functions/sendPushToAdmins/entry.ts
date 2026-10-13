import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { sendToSubs } from '../../shared/webPush.ts';

// Admin callers, or internal calls via service role (workflows / other functions).
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (user && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const { title, body, url, tag } = await req.json();
    const subs = await base44.asServiceRole.entities.PushSubscription.list();
    const sent = await sendToSubs(base44.asServiceRole, subs, { title, body, url: url || '/', tag });
    return Response.json({ sent, total: subs.length });
  } catch (e) {
    console.error('sendPushToAdmins error', e?.message);
    return Response.json({ sent: 0, error: String(e?.message || e) });
  }
});