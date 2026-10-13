import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { sendToSubs } from '../../shared/webPush.ts';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const subs = await base44.asServiceRole.entities.PushSubscription.filter({ user_email: user.email });
  const sent = await sendToSubs(base44.asServiceRole, subs, {
    title: 'התראת בדיקה', body: 'מעולה! התראות הפוש עובדות במכשיר הזה', url: '/settings', tag: 'test',
  });
  return Response.json({ sent, total: subs.length });
});