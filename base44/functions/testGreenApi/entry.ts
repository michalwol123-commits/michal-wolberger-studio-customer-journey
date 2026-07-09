import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    await base44.auth.me();

    const GREEN_ID = Deno.env.get('GREEN_ID');
    const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');

    // Test 1: Check state with the 7107 subdomain
    const url1 = `https://7107.api.greenapi.com/waInstance${GREEN_ID}/getStateInstance/${GREEN_TOKEN}`;
    const r1 = await fetch(url1);
    const t1 = await r1.text();

    // Test 2: Try without subdomain (old URL)
    const url2 = `https://api.green-api.com/waInstance${GREEN_ID}/getStateInstance/${GREEN_TOKEN}`;
    const r2 = await fetch(url2);
    const t2 = await r2.text();

    // Test 3: Try greenapi.com (no hyphen) without subdomain
    const url3 = `https://api.greenapi.com/waInstance${GREEN_ID}/getStateInstance/${GREEN_TOKEN}`;
    const r3 = await fetch(url3);
    const t3 = await r3.text();

    return Response.json({
      green_id: GREEN_ID,
      token_length: GREEN_TOKEN?.length,
      test_7107: { status: r1.status, body: t1.slice(0, 300) },
      test_old: { status: r2.status, body: t2.slice(0, 300) },
      test_no_sub: { status: r3.status, body: t3.slice(0, 300) },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});