// Agent message sender.
// Preview mode: sends the message directly to Michal (email + WhatsApp), nothing logged on the client.
// Live mode: creates pending Communications for the client (existing sendEmail/sendWhatsApp pipeline sends them).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function toE164(phone) {
  const d = String(phone || '').replace(/[^\d]/g, '');
  if (d.startsWith('972')) return d;
  if (d.startsWith('0')) return `972${d.substring(1)}`;
  return d;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { client_id, content, subject } = await req.json();
  if (!client_id || !content) return Response.json({ error: 'client_id and content required' }, { status: 400 });

  const client = await base44.asServiceRole.entities.Client.get(client_id);
  const settings = (await base44.asServiceRole.entities.AgentSettings.list())[0] || {};
  const preview = settings.preview_mode !== false;

  if (!preview) {
    const results = [];
    if (client.phone) {
      await base44.asServiceRole.entities.Communication.create({
        client_id, type: 'whatsapp', direction: 'outbound', content, subject,
        sent_by: 'assistant', status: 'pending', channel: 'base44_native',
      });
      results.push('whatsapp');
    }
    if (client.email) {
      await base44.asServiceRole.entities.Communication.create({
        client_id, type: 'email', direction: 'outbound', content, subject,
        sent_by: 'assistant', status: 'pending', channel: 'base44_native',
      });
      results.push('email');
    }
    return Response.json({ mode: 'live', queued: results, client: client.name });
  }

  const header = `דוגמה, הודעה שהייתה נשלחת ל${client.name}${client.email ? '' : ' (ללקוח אין מייל, בפועל יישלח רק וואטסאפ)'}:\n\n`;
  const body = header + content;
  const sent = [];

  if (settings.preview_phone) {
    const res = await fetch(
      `https://${String(Deno.env.get('GREEN_ID')).trim().slice(0, 4)}.api.greenapi.com/waInstance${String(Deno.env.get('GREEN_ID')).trim()}/sendMessage/${String(Deno.env.get('GREEN_TOKEN')).trim()}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: `${toE164(settings.preview_phone)}@c.us`, message: body }) }
    ).catch((e) => { console.error('Green API fetch failed', e.message); return null; });
    if (!res) { sent.push({ whatsapp: false, error: 'WhatsApp connection failed' }); }
    else {
    const text = await res.text();
    let r = {};
    try { r = JSON.parse(text); } catch { /* non-JSON error page */ }
    const ok = res.ok && !!r.idMessage;
    if (!ok) console.error('Green API failed', res.status, text.slice(0, 300));
    sent.push({ whatsapp: ok, error: ok ? undefined : `WhatsApp error ${res.status}` });
    }
  }

  if (settings.preview_email) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': Deno.env.get('BREVO_API_KEY'), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'סטודיו מיכל וולברגר', email: 'michalwol123@gmail.com' },
        to: [{ email: settings.preview_email }],
        subject: `[דוגמה] ${subject || 'הודעה ללקוח'}`,
        htmlContent: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.8">${body.replace(/\n/g, '<br>')}</div>`,
      }),
    });
    if (!res.ok) console.error('Brevo failed', res.status, (await res.text()).slice(0, 300));
    sent.push({ email: res.ok, error: res.ok ? undefined : `Email error ${res.status}` });
  }

  return Response.json({ mode: 'preview', sent, client: client.name });
});