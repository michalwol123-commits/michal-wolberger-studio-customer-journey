import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    await base44.auth.me();

    const GREEN_ID = (Deno.env.get('GREEN_ID') || '').trim();
    const GREEN_TOKEN = (Deno.env.get('GREEN_TOKEN') || '').trim();
    const BASE = `https://7107.api.greenapi.com/waInstance${GREEN_ID}`;

    // Instance state
    const stateRes = await fetch(`${BASE}/getStateInstance/${GREEN_TOKEN}`);
    const state = await stateRes.text();

    // Which WhatsApp account (phone) is connected to this instance
    const waRes = await fetch(`${BASE}/getWaSettings/${GREEN_TOKEN}`);
    const waSettings = await waRes.text();

    return Response.json({
      green_id: GREEN_ID,
      state: { status: stateRes.status, body: state.slice(0, 300) },
      connected_account: { status: waRes.status, body: waSettings.slice(0, 500) },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});