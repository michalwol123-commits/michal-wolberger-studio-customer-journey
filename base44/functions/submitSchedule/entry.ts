import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, scheduled_at, client_email } = await req.json();

    if (!token || !scheduled_at) {
      return Response.json({ error: 'Missing token or scheduled_at' }, { status: 400 });
    }

    // Find meeting by token (service role)
    const meetings = await base44.asServiceRole.entities.Meeting.filter({ scheduling_token: token });
    const meeting = meetings[0];

    if (!meeting) {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }

    if (meeting.status === 'completed' || meeting.status === 'cancelled') {
      return Response.json({ error: 'meeting_closed' }, { status: 410 });
    }

    // Check calendar conflicts (using Google Calendar API directly)
    const duration = meeting.duration || 45;
    const startTime = new Date(scheduled_at);
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    const params = new URLSearchParams({
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    const calData = await calRes.json();
    const conflicts = (calData.items || []).filter(e => e.status !== 'cancelled');

    if (conflicts.length > 0) {
      return Response.json({
        error: 'conflict',
        conflicting_events: conflicts.map(e => ({
          summary: e.summary || 'ללא שם',
          start: e.start?.dateTime || e.start?.date,
          end: e.end?.dateTime || e.end?.date,
        })),
      }, { status: 409 });
    }

    // Update meeting with the chosen time
    await base44.asServiceRole.entities.Meeting.update(meeting.id, {
      scheduled_at: new Date(scheduled_at).toISOString(),
      status: 'scheduled',
    });

    // Send Google Calendar link via email if client_email provided
    if (client_email) {
      const typeLabels = { intro: 'פגישת היכרות', qualifying: 'פגישת אפיון', quote_presentation: 'הצגת הצעת מחיר', stage_review: 'סקירת שלב', site_visit: 'ביקור אתר', zoom: 'Zoom', design_approval: 'אישור עיצוב' };
      const typeLabel = typeLabels[meeting.type] || meeting.type;
      const start = new Date(scheduled_at);
      const end = new Date(start.getTime() + duration * 60 * 1000);
      const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(typeLabel + ' - Michal Wolberger Studio')}&dates=${fmt(start)}/${fmt(end)}&location=${encodeURIComponent(meeting.location || '')}`;

      const dateStr = start.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const timeStr = start.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: client_email,
        subject: `אישור פגישה — ${typeLabel}`,
        body: `<div dir="rtl" style="font-family: 'Heebo', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #faf8f5; border-radius: 12px; overflow: hidden;">
          <div style="background: #8b7355; padding: 20px 30px; text-align: center;">
            <h1 style="color: #faf8f5; margin: 0; font-size: 22px;">סטודיו מיכל וולברגר</h1>
          </div>
          <div style="padding: 30px; background: #ffffff;">
            <p style="font-size: 16px; line-height: 1.8; color: #2c2c2c;">הפגישה נקבעה בהצלחה ✓</p>
            <p style="font-size: 15px; color: #2c2c2c;"><strong>${typeLabel}</strong><br>${dateStr} בשעה ${timeStr}</p>
            ${meeting.location ? `<p style="font-size: 14px; color: #666;">מיקום: ${meeting.location}</p>` : ''}
            <a href="${gcalUrl}" target="_blank" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #8b7355; color: #fff; border-radius: 8px; text-decoration: none; font-size: 14px;">הוסף ליומן Google</a>
          </div>
        </div>`,
        from_name: 'סטודיו מיכל וולברגר',
      });
    }

    return Response.json({ status: 'ok' });
  } catch (error) {
    console.error('submitSchedule error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});