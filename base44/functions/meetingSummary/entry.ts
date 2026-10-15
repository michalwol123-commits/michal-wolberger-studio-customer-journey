// Meeting summary — one path for the screen and the agent.
// save:       internal_notes (+ photos in notes_files). Internal only, never shown to the client.
// transcribe: handwriting / a photographed page → Hebrew text. Returns the text, saves nothing.
// share:      client_summary + client_summary_shared_at. The summary then shows in the client portal under the
//             meeting's stage, and (optionally) a message goes to the client through agentSendMessage,
//             which respects the agent's preview mode.
// share defaults to dry_run=true: it returns what would happen without changing anything.
import { formatIsraelWhen } from '../../shared/israelTime.ts';
import { meetingLabel } from '../../shared/meetingTypes.ts';
import { stageName } from '../../shared/stages.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_URL = 'https://michal-design-flow.base44.app';
// Meeting types the portal already places on a stage when stage_ref is empty (PortalStageMeetings).
const TYPE_STAGE = { intro: 2, qualifying: 2, quote_presentation: 3 };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const action = body.action || 'save';
    const db = base44.asServiceRole.entities;
    const fail = (error) => Response.json({ ok: false, action, error });

    if (action === 'transcribe') {
      const urls = (Array.isArray(body.file_urls) ? body.file_urls : [body.file_url]).filter(Boolean);
      if (!urls.length) return fail('file_url או file_urls חובה');
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `לפניך כתב יד או צילום של דף סיכום פגישה של מעצבת פנים, בעיקר בעברית.
תמלל/י את הטקסט במדויק, בלי להוסיף, בלי לסכם ובלי לתקן תוכן. שמור/י על שורות ועל רשימות כפי שהן.
מילה שלא ניתן לקרוא: כתוב/כתבי [?]. אם יש שרטוט או סקיצה, כתוב/כתבי בשורה נפרדת: [סקיצה: תיאור קצר].`,
        file_urls: urls,
        response_json_schema: { type: 'object', properties: { text: { type: 'string' } } },
      });
      return Response.json({ ok: true, action, text: (result?.text || '').trim() });
    }

    const { meeting_id } = body;
    if (!meeting_id) return fail('meeting_id חובה. לפגישה שעוד לא קיימת: קודם agentMeeting עם action=log_past');
    const meeting = await db.Meeting.get(meeting_id).catch(() => null);
    if (!meeting) return fail('הפגישה לא נמצאה');
    const client = meeting.client_id ? await db.Client.get(meeting.client_id).catch(() => null) : null;
    const title = meetingLabel(meeting);
    const when = meeting.scheduled_at ? formatIsraelWhen(meeting.scheduled_at) : '';

    if (action === 'save') {
      const changes = {};
      if (typeof body.internal_notes === 'string') {
        const text = body.internal_notes.trim();
        changes.internal_notes = body.append && meeting.internal_notes ? `${meeting.internal_notes}\n\n${text}` : text;
      }
      const files = (Array.isArray(body.notes_files) ? body.notes_files : []).filter(Boolean);
      // The screen sends the full list (replace_files); the agent only adds photos.
      if (body.replace_files && Array.isArray(body.notes_files)) changes.notes_files = files;
      else if (files.length) changes.notes_files = [...new Set([...(meeting.notes_files || []), ...files])];
      if (!Object.keys(changes).length) return fail('אין מה לשמור: internal_notes או notes_files');
      await base44.entities.Meeting.update(meeting_id, changes);
      const saved = await db.Meeting.get(meeting_id);
      return Response.json({
        ok: true, action, meeting_id, title, when_israel: when,
        internal_notes: saved.internal_notes || '', notes_files: saved.notes_files || [],
        note: 'נשמר כסיכום פנימי. הלקוח לא רואה אותו.',
      });
    }

    if (action === 'share') {
      const text = String(body.client_summary || '').trim();
      if (!text) return fail('client_summary חובה: הנוסח שהלקוח יראה');
      if (!client) return fail('לפגישה אין לקוח');
      const dryRun = body.dry_run !== false;
      const sendMessage = body.send_message !== false;

      let stage = meeting.stage_ref || null;
      if (!stage && meeting.project_id) {
        const project = await db.Project.get(meeting.project_id).catch(() => null);
        stage = project?.stage_current || null;
      }
      if (!stage) stage = TYPE_STAGE[meeting.type] || null;
      const settings = (await db.AgentSettings.list())[0] || {};
      const preview = settings.preview_mode !== false;

      const consequences = [];
      consequences.push(meeting.project_id && stage
        ? `הסיכום יופיע בפורטל של ${client.name} בשלב ${stage} (${stageName(stage)}), תחת "פגישות".`
        : 'לפגישה אין פרויקט, ולכן הסיכום יישמר אבל לא יופיע בפורטל. אפשר לשייך פרויקט ואז לשתף.');
      if (sendMessage) {
        const channels = [client.phone && 'וואטסאפ', client.email && 'מייל'].filter(Boolean).join(' ו');
        consequences.push(preview
          ? 'הסוכן במצב דוגמה: ההודעה תגיע אלייך לבדיקה ולא ללקוח.'
          : `תישלח ללקוח הודעה עם הסיכום${channels ? ` ב${channels}` : ''}.`);
      } else {
        consequences.push('לא תישלח הודעה. הסיכום רק יתווסף לפורטל.');
      }

      const portal = client.portal_token ? `\n\nהסיכום שמור גם בפורטל שלכם:\n${APP_URL}/portal?token=${client.portal_token}` : '';
      const message = `שלום ${client.name},\nתודה על ${title}${when ? ` (${when.replace(/^יום /, 'ביום ')})` : ''}.\nהנה סיכום קצר:\n\n${text}${portal}`;

      if (dryRun) return Response.json({ ok: true, action, dry_run: true, meeting_id, title, when_israel: when, consequences, message_preview: sendMessage ? message : null });

      await base44.entities.Meeting.update(meeting_id, {
        client_summary: text,
        client_summary_shared_at: new Date().toISOString(),
        ...(stage && !meeting.stage_ref && meeting.project_id ? { stage_ref: stage } : {}),
      });
      let sent = null;
      if (sendMessage) {
        const res = await base44.functions.invoke('agentSendMessage', { client_id: client.id, content: message, subject: `סיכום ${title}` });
        sent = res?.data ?? res;
      }
      return Response.json({ ok: true, action, dry_run: false, meeting_id, title, consequences, sent });
    }

    return fail(`פעולה לא מוכרת: ${action}. אפשרויות: save, transcribe, share`);
  } catch (error) {
    console.error('meetingSummary error:', error.message);
    return Response.json({ ok: false, error: error.message });
  }
});
