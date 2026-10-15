// Agent tool: every meeting action of the agent goes through here.
// Times come in as Israel wall-clock (date YYYY-MM-DD + time HH:mm) and go out as ready-made Israel text
// (when_israel), so the agent never converts time zones itself.
// It writes the same Meeting fields as the screen, so the same automations run:
// calendar sync + client invitation (autoMeetingCreated), "date updated" email (autoMeetingUpdated), reminders.
// dry_run=true returns what would happen (consequences) without writing anything.
import { israelIso, formatIsraelWhen, israelNowInfo, israelDateOf, israelToday } from '../../shared/israelTime.ts';
import { MEETING_TYPE_LABELS, meetingLabel } from '../../shared/meetingTypes.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const STATUS_HE = { scheduled: 'מתוכננת', completed: 'התקיימה', cancelled: 'בוטלה', no_show: 'לא הגיע', rescheduled: 'נדחתה' };
const UPDATABLE = ['type', 'custom_title', 'project_id', 'location', 'summary', 'stage_ref', 'meeting_price', 'who_attends'];

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const isTime = (s) => /^\d{1,2}:\d{2}$/.test(String(s || ''));

function describe(m, clientName) {
  return {
    id: m.id,
    client_id: m.client_id,
    client_name: clientName || '',
    project_id: m.project_id || null,
    type: m.type,
    title: meetingLabel(m),
    status: m.status,
    status_he: STATUS_HE[m.status] || m.status,
    when_israel: m.scheduled_at ? formatIsraelWhen(m.scheduled_at) : 'ללא מועד',
    duration: m.duration || 45,
    location: m.location || '',
    description: m.summary || '',
    has_internal_notes: !!m.internal_notes,
    client_summary_shared: !!m.client_summary_shared_at,
    in_google_calendar: !!m.google_event_id,
  };
}

async function calendarConflicts(base44, startIso, duration, excludeEventId) {
  try {
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const start = new Date(startIso);
    const end = new Date(start.getTime() + duration * 60000);
    const params = new URLSearchParams({ timeMin: start.toISOString(), timeMax: end.toISOString(), singleEvents: 'true', orderBy: 'startTime' });
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    return (data.items || [])
      .filter((e) => e.status !== 'cancelled' && e.id !== excludeEventId)
      .map((e) => ({ summary: e.summary || 'ללא שם', when_israel: e.start?.dateTime ? formatIsraelWhen(e.start.dateTime) : (e.start?.date || '') }));
  } catch (e) {
    return [{ summary: `לא הצלחתי לבדוק את היומן (${e.message}). כדאי לבדוק ידנית.`, when_israel: '' }];
  }
}

async function deleteCalendarEvent(base44, eventId) {
  if (!eventId) return 'no_event';
  const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.ok || res.status === 404 || res.status === 410) return 'deleted';
  throw new Error(`Calendar delete failed: ${res.status} ${await res.text()}`);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const action = body.action || 'list';
    const dryRun = body.dry_run !== false && action !== 'list' && action !== 'now';
    const now = israelNowInfo();
    const db = base44.asServiceRole.entities;

    const clientOf = async (id) => (id ? await db.Client.get(id).catch(() => null) : null);
    const out = (extra) => Response.json({ ok: true, action, dry_run: dryRun, now_israel: now.text, ...extra });
    // Errors come back as 200 + ok:false so the agent can read the explanation and tell Michal.
    const fail = (error) => Response.json({ ok: false, action, error, now_israel: now.text });

    if (action === 'now') return out({ now });

    if (action === 'list') {
      const query = {};
      if (body.client_id) query.client_id = body.client_id;
      if (body.project_id) query.project_id = body.project_id;
      if (body.status) query.status = body.status;
      let meetings = await db.Meeting.filter(query, '-scheduled_at', 300);
      const from = isDate(body.from_date) ? body.from_date : (body.client_id || body.project_id ? null : israelToday(-7));
      const to = isDate(body.to_date) ? body.to_date : (body.client_id || body.project_id ? null : israelToday(30));
      meetings = meetings.filter((m) => {
        if (!m.scheduled_at) return !from && !to;
        const d = israelDateOf(m.scheduled_at);
        return (!from || d >= from) && (!to || d <= to);
      }).sort((a, b) => String(a.scheduled_at || '').localeCompare(String(b.scheduled_at || '')));
      const clients = {};
      for (const m of meetings) if (!(m.client_id in clients)) clients[m.client_id] = (await clientOf(m.client_id))?.name || '';
      return out({ range: { from, to }, count: meetings.length, meetings: meetings.map((m) => describe(m, clients[m.client_id])) });
    }

    // ---- create / log_past ----
    if (action === 'create' || action === 'log_past') {
      const { client_id, type } = body;
      if (!client_id || !type) return fail('client_id ו-type חובה');
      if (!MEETING_TYPE_LABELS[type]) return fail(`סוג פגישה לא מוכר: ${type}. אפשרויות: ${Object.keys(MEETING_TYPE_LABELS).join(', ')}`);
      if (type === 'other' && !body.custom_title) return fail('לפגישה מסוג other צריך custom_title (שם הפגישה)');
      const client = await clientOf(client_id);
      if (!client) return fail('הלקוח לא נמצא');
      if (body.project_id) {
        const project = await db.Project.get(body.project_id).catch(() => null);
        if (!project || project.client_id !== client_id) return fail('הפרויקט לא שייך ללקוח הזה');
      }
      if (body.date && !isDate(body.date)) return fail('date בפורמט YYYY-MM-DD');
      if (body.time && !isTime(body.time)) return fail('time בפורמט HH:mm');
      if (action === 'log_past' && !body.date) return fail('לתיעוד פגישה שהתקיימה צריך date');
      if (action === 'create' && body.date && !body.time) return fail('לקביעת פגישה עם תאריך צריך גם time (שעון ישראל)');

      const duration = Number(body.duration) || 45;
      const scheduledAt = body.date ? israelIso(body.date, body.time || '12:00') : undefined;
      const record = {
        client_id,
        type,
        status: action === 'log_past' ? 'completed' : 'scheduled',
        duration,
        ...(scheduledAt ? { scheduled_at: scheduledAt } : {}),
      };
      for (const k of UPDATABLE) if (body[k] !== undefined && body[k] !== null && body[k] !== '' && k !== 'type') record[k] = body[k];
      if (body.internal_notes) record.internal_notes = body.internal_notes;

      const consequences = [];
      let conflicts = [];
      if (action === 'log_past') {
        consequences.push('תירשם פגישה שכבר התקיימה. לא ייווצר אירוע ביומן ולא יישלח שום דבר ללקוח.');
      } else if (!scheduledAt) {
        consequences.push(`יישלח ללקוח קישור לבחירת מועד${client.phone ? ' בוואטסאפ' : ''}${client.email ? (client.phone ? ' ובמייל' : ' במייל') : ''}.`);
      } else {
        conflicts = await calendarConflicts(base44, scheduledAt, duration, null);
        consequences.push('ייווצר אירוע ביומן הגוגל של מיכל.');
        consequences.push(client.email ? `יישלח ללקוח מייל הזמנה עם המועד: ${formatIsraelWhen(scheduledAt)}.` : 'ללקוח אין מייל, לכן לא תישלח הזמנה במייל.');
        consequences.push('יום לפני ושעה לפני תישלח ללקוח תזכורת בוואטסאפ.');
      }
      if (type === 'quote_presentation' && record.meeting_price && action === 'create') {
        consequences.push(`אם עדיין אין ללקוח תשלום על פגישת הצעת מחיר, ייווצר תשלום של ₪${record.meeting_price}.`);
      }

      const preview = { client_name: client.name, title: meetingLabel(record), when_israel: scheduledAt ? formatIsraelWhen(scheduledAt) : 'ללא מועד (הלקוח יבחר)', duration };
      if (dryRun) return out({ preview, consequences, conflicts });

      const created = await base44.entities.Meeting.create(record);
      const saved = await db.Meeting.get(created.id);
      return out({ meeting: describe(saved, client.name), consequences, conflicts });
    }

    // ---- actions on an existing meeting ----
    const { meeting_id } = body;
    if (!meeting_id) return fail('meeting_id חובה');
    const meeting = await db.Meeting.get(meeting_id).catch(() => null);
    if (!meeting) return fail('הפגישה לא נמצאה');
    const client = await clientOf(meeting.client_id);
    const current = describe(meeting, client?.name);

    if (action === 'reschedule') {
      if (!isDate(body.date) || !isTime(body.time)) return fail('לשינוי מועד צריך date (YYYY-MM-DD) ו-time (HH:mm) בשעון ישראל');
      if (meeting.status === 'completed' || meeting.status === 'cancelled') return fail(`הפגישה ${STATUS_HE[meeting.status]}. אפשר לקבוע פגישה חדשה במקומה.`);
      const duration = Number(body.duration) || meeting.duration || 45;
      const scheduledAt = israelIso(body.date, body.time);
      const conflicts = await calendarConflicts(base44, scheduledAt, duration, meeting.google_event_id);
      const consequences = [
        `המועד ישתנה מ-${current.when_israel} ל-${formatIsraelWhen(scheduledAt)}.`,
        meeting.google_event_id ? 'האירוע ביומן יתעדכן.' : 'ייווצר אירוע ביומן.',
        client?.email ? 'יישלח ללקוח מייל שהמועד עודכן.' : 'ללקוח אין מייל, לכן לא יישלח עדכון במייל.',
        'התזכורות ללקוח (יום לפני ושעה לפני) יישלחו לפי המועד החדש.',
      ];
      if (dryRun) return out({ meeting: current, new_when_israel: formatIsraelWhen(scheduledAt), consequences, conflicts });
      await base44.entities.Meeting.update(meeting_id, {
        scheduled_at: scheduledAt,
        duration,
        status: 'scheduled',
        reminder_d1_sent: false,
        reminder_h1_sent: false,
      });
      const saved = await db.Meeting.get(meeting_id);
      return out({ meeting: describe(saved, client?.name), consequences, conflicts });
    }

    if (action === 'cancel') {
      if (meeting.status === 'cancelled') return fail('הפגישה כבר מבוטלת');
      const consequences = [
        'הפגישה תסומן כבוטלה.',
        meeting.google_event_id ? 'האירוע יימחק מהיומן.' : 'אין לה אירוע ביומן.',
        'ללקוח לא יישלח שום דבר אוטומטית. אם צריך להודיע לו, מנסחים הודעה ושולחים דרך agentSendMessage אחרי אישור של מיכל.',
      ];
      if (dryRun) return out({ meeting: current, consequences });
      const calendar = await deleteCalendarEvent(base44, meeting.google_event_id);
      await base44.entities.Meeting.update(meeting_id, { status: 'cancelled', ...(meeting.google_event_id ? { google_event_id: '' } : {}) });
      const saved = await db.Meeting.get(meeting_id);
      return out({ meeting: describe(saved, client?.name), calendar, consequences });
    }

    if (action === 'complete' || action === 'no_show') {
      const status = action === 'complete' ? 'completed' : 'no_show';
      if (meeting.status === status) return fail(`הפגישה כבר מסומנת "${STATUS_HE[status]}"`);
      const consequences = [`הפגישה תסומן "${STATUS_HE[status]}".`];
      if (status === 'completed') {
        if (meeting.type === 'quote_presentation') consequences.push('סטטוס הלקוח יתעדכן ל"הוצגה הצעת מחיר".');
        if (['site_visit', 'installation_day', 'shopping_day'].includes(meeting.type) && meeting.project_id) {
          consequences.push('היום ייספר במכסת הימים של הפרויקט, וללקוח יישלח מייל "סיכום יום".');
        }
        if (meeting.type === 'intro') consequences.push('שימי לב: לשיחת היכרות יש במסך הפגישות המשך (מחיר הפגישה ו"ממשיכים"/"ארכיון"). את זה עושים מהמסך.');
      }
      if (dryRun) return out({ meeting: current, consequences });
      await base44.entities.Meeting.update(meeting_id, { status });
      const saved = await db.Meeting.get(meeting_id);
      return out({ meeting: describe(saved, client?.name), consequences });
    }

    if (action === 'update') {
      const changes = {};
      for (const k of UPDATABLE) if (body[k] !== undefined) changes[k] = body[k];
      if (!Object.keys(changes).length) return fail(`אין מה לעדכן. שדות אפשריים: ${UPDATABLE.join(', ')}. לשינוי מועד או משך: reschedule`);
      if (changes.type && !MEETING_TYPE_LABELS[changes.type]) return fail(`סוג פגישה לא מוכר: ${changes.type}`);
      if ((changes.type || meeting.type) === 'other' && !(changes.custom_title ?? meeting.custom_title)) return fail('לפגישה מסוג other צריך custom_title');
      if (changes.project_id) {
        const project = await db.Project.get(changes.project_id).catch(() => null);
        if (!project || project.client_id !== meeting.client_id) return fail('הפרויקט לא שייך ללקוח של הפגישה');
      }
      const consequences = ['יעודכנו רק הפרטים שביקשת. ללקוח לא יישלח כלום, והיומן לא משתנה.'];
      if (dryRun) return out({ meeting: current, changes, consequences });
      await base44.entities.Meeting.update(meeting_id, changes);
      const saved = await db.Meeting.get(meeting_id);
      return out({ meeting: describe(saved, client?.name), consequences });
    }

    return fail(`פעולה לא מוכרת: ${action}. אפשרויות: now, list, create, reschedule, cancel, complete, no_show, log_past, update`);
  } catch (error) {
    console.error('agentMeeting error:', error.message);
    return Response.json({ ok: false, error: error.message });
  }
});
