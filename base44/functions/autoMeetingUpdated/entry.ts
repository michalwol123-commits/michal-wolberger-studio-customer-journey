// Automation — Sync meeting to Google Calendar when meeting's scheduled_at is updated
// Trigger: Meeting entity updated (scheduled_at changed)
// If no google_event_id → create calendar event
// If google_event_id exists → update the existing calendar event
// Emails sent via Brevo (Communication pending → sendEmail picks it up)
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MEETING_TYPE_LABELS = {
  intro: 'שיחת טלפון ראשונית',
  qualifying: 'פגישת סינון',
  quote_presentation: 'היכרות והצגת הצעת מחיר',
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

    // --- 1. Google Calendar sync ---
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
    }

    // --- 2. Send email via Brevo (Communication pending) ---
    if (client.email) {
      const dateStr = scheduledAt.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const timeStr = scheduledAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

      const isReschedule = !!data.google_event_id && old_data?.scheduled_at;
      const subject = isReschedule
        ? `עדכון מועד — ${meetingLabel} — ${dateStr}`
        : `הזמנה ל${meetingLabel} — ${dateStr}`;

      const priceRow = (data.type === 'quote_presentation' && data.meeting_price)
        ? `<tr><td style="padding: 8px; font-weight: bold; color: #555;">מחיר פגישה:</td><td style="padding: 8px;">${data.meeting_price}₪</td></tr>`
        : '';

      const emailContent = `שלום ${client.name},\n\n${isReschedule ? 'מועד הפגישה שלך עודכן:' : 'נקבעה עבורך פגישה חדשה:'}\n\nסוג פגישה: ${meetingLabel}\nתאריך: ${dateStr}\nשעה: ${timeStr}\nמשך: ${duration} דקות${data.location ? '\nמיקום: ' + data.location : ''}${data.type === 'quote_presentation' && data.meeting_price ? '\nמחיר פגישה: ' + data.meeting_price + '₪' : ''}\n\nנשמח לראות אותך! 😊`;

      await base44.asServiceRole.entities.Communication.create({
        client_id: client.id,
        project_id: data.project_id || undefined,
        type: 'email',
        direction: 'outbound',
        subject: subject,
        content: emailContent,
        sent_by: 'system',
        status: 'pending',
        channel: 'base44_native',
      });
    }

    // --- 3. Sync meeting date to linked Quote ---
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