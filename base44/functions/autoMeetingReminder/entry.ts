// Automation E — Meeting Reminder (D-1 + H-1)
// Trigger: Scheduled (every 30 min)
// Condition: Meeting scheduled within 24h (D-1) or 1h (H-1) and reminder not sent
// Action: Communication (pending)
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    const meetings = await base44.asServiceRole.entities.Meeting.filter({ status: 'scheduled' });
    let actioned = 0;

    for (const meeting of meetings) {
      if (!meeting.scheduled_at) continue;
      const meetingTime = new Date(meeting.scheduled_at);

      // Get client
      const clients = await base44.asServiceRole.entities.Client.filter({ id: meeting.client_id });
      const clientName = clients[0]?.name || 'לקוח';

      // D-1 reminder (meeting is within 24h but more than 1h away)
      if (!meeting.reminder_d1_sent && meetingTime <= oneDayLater && meetingTime > oneHourLater) {
        await base44.asServiceRole.entities.Communication.create({
          client_id: meeting.client_id,
          project_id: meeting.project_id || '',
          type: 'whatsapp',
          direction: 'outbound',
          content: `שלום ${clientName}, תזכורת: יש לנו פגישה מחר (${meetingTime.toLocaleDateString('he-IL')}) בשעה ${meetingTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}${meeting.location ? ` ב${meeting.location}` : ''}. נתראה!`,
          sent_by: 'system',
          status: 'pending',
          channel: 'base44_native',
        });
        await base44.asServiceRole.entities.Meeting.update(meeting.id, { reminder_d1_sent: true });
        actioned++;
      }

      // H-1 reminder (meeting is within 1h)
      if (!meeting.reminder_h1_sent && meetingTime <= oneHourLater && meetingTime > now) {
        await base44.asServiceRole.entities.Communication.create({
          client_id: meeting.client_id,
          project_id: meeting.project_id || '',
          type: 'whatsapp',
          direction: 'outbound',
          content: `שלום ${clientName}, הפגישה שלנו מתחילה בעוד שעה${meeting.location ? ` ב${meeting.location}` : ''}. נתראה בקרוב!`,
          sent_by: 'system',
          status: 'pending',
          channel: 'base44_native',
        });
        await base44.asServiceRole.entities.Meeting.update(meeting.id, { reminder_h1_sent: true });
        actioned++;
      }
    }

    return Response.json({ success: true, automation: 'E', actioned });
  } catch (error) {
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.Communication.create({
        client_id: '',
        type: 'system_error',
        direction: 'outbound',
        content: `Automation E (Meeting Reminder) failed: ${error.message}`,
        sent_by: 'system',
        status: 'failed',
        channel: 'base44_native',
        error_detail: error.message,
        retry_count: 0,
      });
    } catch (_) { /* silent */ }
    return Response.json({ error: error.message }, { status: 500 });
  }
});