// Real-time WhatsApp alerts to Michal (from the system bot number).
// Mode A (workflows): { event, entity_name, entity_id } → builds the alert from the record.
// Mode B (admin / agent): { message } → sends free text to Michal.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP = 'https://michal-design-flow.base44.app';
const ALL_EVENTS = ['questionnaire_submitted', 'document_signed', 'document_approval', 'portal_comment', 'concept_approved', 'floor_plan_confirmed', 'quote_approved'];

function toE164(phone) {
  const d = String(phone || '').replace(/[^\d]/g, '');
  if (d.startsWith('972')) return d;
  if (d.startsWith('0')) return `972${d.substring(1)}`;
  return d;
}

async function sendWA(phone, message) {
  const id = String(Deno.env.get('GREEN_ID') || '').trim();
  const token = String(Deno.env.get('GREEN_TOKEN') || '').trim();
  const res = await fetch(`https://${id.slice(0, 4)}.api.greenapi.com/waInstance${id}/sendMessage/${token}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId: `${toE164(phone)}@c.us`, message }),
  });
  const r = await res.json().catch(() => ({}));
  if (!res.ok || !r.idMessage) console.error('Green API failed', res.status, JSON.stringify(r).slice(0, 200));
  return res.ok && !!r.idMessage;
}

async function buildAlert(sr, event, entity_name, entity_id) {
  const rec = await sr.entities[entity_name].get(entity_id);
  let project = null, client = null;
  const projectId = entity_name === 'Project' ? rec.id : rec.project_id;
  if (projectId) project = await sr.entities.Project.get(projectId).catch(() => null);
  const clientId = rec.client_id || project?.client_id;
  if (clientId) client = await sr.entities.Client.get(clientId).catch(() => null);
  const who = client?.name || 'לקוח';
  const link = project ? `${APP}/projects/${project.id}` : client ? `${APP}/clients/${client.id}` : APP;

  const texts = {
    questionnaire_submitted: `${who} שלח/ה ${rec.type === 'detailed' ? 'את השאלון המפורט' : 'את השאלון הקצר'}${rec.type === 'short' && !client ? ` (${rec.name || ''})` : ''}`,
    document_signed: `${who} חתם/ה על "${rec.name}"`,
    document_approval: `${who} ${rec.approval_status === 'approved' ? 'אישר/ה' : 'ביקש/ה תיקונים ב'} "${rec.name}"`,
    portal_comment: entity_name === 'FieldVisit'
      ? `${who} הגיב/ה על דוח השטח${rec.client_comment ? `: "${rec.client_comment}"` : ''}`
      : `${who} הגיב/ה בלוח ההשראה${rec.title ? ` על "${rec.title}"` : ''}${rec.client_comment ? `: "${rec.client_comment}"` : ''}`,
    concept_approved: `${who} אישר/ה את הקונספט העיצובי`,
    floor_plan_confirmed: `${who} אישר/ה את תכנית ההעמדה`,
    quote_approved: `${who} אישר/ה את הצעת המחיר "${rec.title || ''}"`,
  };
  return `עדכון מהמערכת\n${texts[event]}\n\n${link}`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const sr = base44.asServiceRole;
  const body = await req.json();
  const settings = (await sr.entities.AgentSettings.list())[0] || {};
  const phone = settings.michal_phone || '0524687812';

  if (body.message) {
    const user = await base44.auth.me().catch(() => null);
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (body.dry_run !== false) return Response.json({ dry_run: true, to: phone, message: body.message });
    const ok = await sendWA(phone, body.message);
    return Response.json({ sent: ok, to: phone });
  }

  const { event, entity_name, entity_id } = body;
  if (!ALL_EVENTS.includes(event) || !entity_name || !entity_id) return Response.json({ error: 'bad request' }, { status: 400 });
  if (settings.notify_enabled === false) return Response.json({ skipped: true, reason: 'alerts off' });
  const events = settings.notify_events?.length ? settings.notify_events : ALL_EVENTS;
  if (!events.includes(event)) return Response.json({ skipped: true, reason: 'event off' });

  const message = await buildAlert(sr, event, entity_name, entity_id);
  const ok = await sendWA(phone, message);
  return Response.json({ sent: ok, event });
});