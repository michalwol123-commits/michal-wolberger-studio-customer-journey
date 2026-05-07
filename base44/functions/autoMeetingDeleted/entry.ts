import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { data, event } = body;

    if (!data || event?.type !== 'delete') {
      return Response.json({ status: 'skipped', reason: 'not a delete event' });
    }

    const googleEventId = data.google_event_id;
    if (!googleEventId) {
      return Response.json({ status: 'skipped', reason: 'no google_event_id on meeting' });
    }

    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    if (res.status === 204 || res.status === 200) {
      console.log('Google Calendar event deleted:', googleEventId);
      return Response.json({ status: 'ok', deleted: googleEventId });
    }

    if (res.status === 410 || res.status === 404) {
      console.log('Google Calendar event already gone:', googleEventId);
      return Response.json({ status: 'ok', note: 'event already deleted' });
    }

    const errText = await res.text();
    console.error('Failed to delete calendar event:', res.status, errText);
    return Response.json({ status: 'error', detail: errText }, { status: 500 });
  } catch (error) {
    console.error('autoMeetingDeleted error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});