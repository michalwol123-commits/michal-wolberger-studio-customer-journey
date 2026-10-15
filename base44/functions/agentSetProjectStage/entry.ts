// Kept for compatibility: the agent's stage tool is now setProjectStage, which this forwards to.
// Old behaviour was "execute immediately", so dry_run defaults to false here.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const res = await base44.functions.invoke('setProjectStage', { ...body, dry_run: body.dry_run ?? false });
  return Response.json(res?.data ?? res);
});
