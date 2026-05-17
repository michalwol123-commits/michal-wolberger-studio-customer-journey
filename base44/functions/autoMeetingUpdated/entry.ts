// Automation — Sync meeting to Google Calendar when admin updates scheduled_at
// Trigger: Meeting entity updated
// If no google_event_id → create calendar event + send email
// If google_event_id exists → update the existing calendar event
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MEETING_TYPE_LABELS = {
  intro: 'פגישת היכרות',
  qualifying: 'פגישת סינון',
  quote_presentation: 'הצגת הצעת מחיר',
  stage_review: 'סקירת שלב',
  site_visit: 'ביקור באתר',
  zoom: 'פגישת זום',
  design_approval: 'אישור עיצוב',
};

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { data, old_data, event, changed_fields } = body;

    if (!data || event?.type !== 'update') {
      return Response.json({ status: 'skipped', reason: 'not an update event' });
    }

    // Only proceed if scheduled_at was changed
    if (!changed_fields || !changed_fields.includes('scheduled_at')) {
      return Response.json({ status: 'skipped', reason: 'scheduled_at not changed' });
    }

    // Don't sync cancelled/no_show meetings
    if (data.status === 'cancelled' || data.status === 'no_show') {
      return Response.json({ status: 'skipped', reason: 'meeting is cancelled/no_show' });
    }

    const base44 = createClientFromRequest(req);

    // Get client details
    const clients = await base44.asServiceRole.entities.Client.filter({ id: data.client_id });
    const client = clients[0];
    if (!client) {
      return Response.json({ status: 'skipped', reason: 'client not found' });
    }

    const meetingLabel = MEETING_TYPE_LABELS[data.type] || data.type || 'פגישה';
    const scheduledAt = new Date(data.scheduled_at);
    const duration = data.duration || 45;
    const endTime = new Date(scheduledAt.getTime() + duration * 60 * 1000);

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    const calendarEvent = {
      summary: `${meetingLabel} — ${client.name}`,
      description: `לקוח: ${client.name}\nטלפון: ${client.phone}${data.summary ? '\nהערות: ' + data.summary : ''}`,
      start: {
        dateTime: scheduledAt.toISOString(),
        timeZone: 'Asia/Jerusalem',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Asia/Jerusalem',
      },
    };

    if (data.location) {
      calendarEvent.location = data.location;
    }

    let googleEventId = data.google_event_id;

    if (googleEventId) {
      // Update existing Google Calendar event
      const calRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calendarEvent),
      });
      const calData = await calRes.json();
      console.log('Calendar event updated:', calData.id);
    } else {
      // Create new Google Calendar event
      const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calendarEvent),
      });
      const calData = await calRes.json();
      googleEventId = calData.id;
      console.log('Calendar event created:', calData.id);

      // Save google_event_id on the meeting record
      await base44.asServiceRole.entities.Meeting.update(event.entity_id, {
        google_event_id: googleEventId,
      });

      // Send email invitation to client (only on first sync, not on reschedule)
      if (client.email) {
        const dateStr = scheduledAt.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const timeStr = scheduledAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

        const priceRow = (data.type === 'quote_presentation' && data.meeting_price)
          ? `<tr><td style="padding: 8px; font-weight: bold; color: #555;">מחיר פגישה:</td><td style="padding: 8px;">${data.meeting_price}₪</td></tr>`
          : '';

        const emailBody = `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #8B6F47;">שלום ${client.name},</h2>
            <p>נקבעה עבורך פגישה חדשה:</p>
            <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
              <tr><td style="padding: 8px; font-weight: bold; color: #555;">סוג פגישה:</td><td style="padding: 8px;">${meetingLabel}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold; color: #555;">תאריך:</td><td style="padding: 8px;">${dateStr}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold; color: #555;">שעה:</td><td style="padding: 8px;">${timeStr}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold; color: #555;">משך:</td><td style="padding: 8px;">${duration} דקות</td></tr>
              ${data.location ? `<tr><td style="padding: 8px; font-weight: bold; color: #555;">מיקום:</td><td style="padding: 8px;">${data.location}</td></tr>` : ''}
              ${priceRow}
            </table>
            <p>נשמח לראות אותך! 😊</p>
            <p style="color: #999; font-size: 12px; margin-top: 24px;">הודעה זו נשלחה אוטומטית מהסטודיו</p>
          </div>
        `;

        const subject = `הזמנה ל${meetingLabel} — ${dateStr}`;
        const { accessToken: gmailToken } = await base44.asServiceRole.connectors.getConnection('gmail');
        const subjectEncoded = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
        const emailRaw = [
          `From: "סטודיו מיכל וולברגר" <me>`,
          `To: ${client.email}`,
          `Subject: ${subjectEncoded}`,
          `MIME-Version: 1.0`,
          `Content-Type: text/html; charset=utf-8`,
          ``,
          emailBody
        ].join('\r\n');
        const raw = btoa(unescape(encodeURIComponent(emailRaw)))
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${gmailToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ raw }),
        });
        if (!gmailRes.ok) throw new Error(`Gmail error: ${JSON.stringify(await gmailRes.json())}`);

        await base44.asServiceRole.entities.Communication.create({
          client_id: client.id,
          project_id: data.project_id || undefined,
          type: 'email',
          direction: 'outbound',
          content: `הזמנה ל${meetingLabel} נשלחה ללקוח — ${dateStr} בשעה ${timeStr}`,
          sent_by: 'system',
          status: 'sent',
          channel: 'base44_native',
        });
      }
    }

    // Sync meeting date to linked Quote (if quote_presentation with quote_id)
    if (data.type === 'quote_presentation' && data.quote_id) {
      const meetingDate = scheduledAt.toISOString().split('T')[0];
      await base44.asServiceRole.entities.Quote.update(data.quote_id, {
        meeting_date: meetingDate,
      });
      console.log('Quote meeting_date synced:', data.quote_id, meetingDate);
    }

    return Response.json({ status: 'ok', google_event_id: googleEventId });
  } catch (error) {
    console.error('autoMeetingUpdated error:', error.message);

    try {
      const base44 = createClientFromRequest(req);
      const body = await req.json().catch(() => ({}));
      await base44.asServiceRole.entities.Communication.create({
        client_id: body.data?.client_id || '',
        type: 'system_error',
        direction: 'outbound',
        content: `שגיאה באוטומציית עדכון פגישה: ${error.message}`,
        sent_by: 'system',
        status: 'failed',
        channel: 'base44_native',
      });
    } catch (_) { /* ignore logging errors */ }

    return Response.json({ error: error.message }, { status: 500 });
  }
});