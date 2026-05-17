import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  return Response.json({
    BASE44_APP_URL: Deno.env.get('BASE44_APP_URL') || 'NOT SET',
    BASE44_APP_ID: Deno.env.get('BASE44_APP_ID') || 'NOT SET',
  });
});