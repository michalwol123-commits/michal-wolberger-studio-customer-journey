import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scheduled_at, duration } = await req.json();
    if (!scheduled_at || !duration) {
      return Response.json({ error: 'Missing scheduled_at or duration' }, { status: 400 });
    }

    const startTime = new Date(scheduled_at);
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    const params = new URLSearchParams({
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    const data = await res.json();
    const events = (data.items || []).filter(e => e.status !== 'cancelled');

    const conflictingEvents = events.map(e => ({
      summary: e.summary || 'ללא שם',
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
    }));

    return Response.json({
      hasConflict: conflictingEvents.length > 0,
      conflictingEvents,
    });
  } catch (error) {
    console.error('checkCalendarConflict error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});