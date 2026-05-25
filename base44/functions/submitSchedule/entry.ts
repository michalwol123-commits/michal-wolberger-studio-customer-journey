import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    // Clone the request so we can read body AND pass original to SDK
    const cloned = req.clone();
    const { token, scheduled_at } = await cloned.json();

    if (!token || !scheduled_at) {
      return Response.json({ error: 'Missing token or scheduled_at' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Find meeting by token (service role — public page, no auth)
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

    return Response.json({ status: 'ok' });
  } catch (error) {
    console.error('submitSchedule error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});