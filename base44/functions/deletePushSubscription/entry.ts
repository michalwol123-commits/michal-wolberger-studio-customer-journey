import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const { endpoint } = await req.json();
  if (!endpoint) return Response.json({ error: 'endpoint required' }, { status: 400 });
  await base44.asServiceRole.entities.PushSubscription.deleteMany({ endpoint });
  return Response.json({ ok: true });
});