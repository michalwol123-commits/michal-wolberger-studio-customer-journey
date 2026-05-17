import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const headers = {};
  for (const [key, value] of req.headers.entries()) {
    headers[key] = value;
  }

  const envKeys = Object.keys(Deno.env.toObject());

  return Response.json({
    all_env_keys: envKeys,
    headers,
  });
});