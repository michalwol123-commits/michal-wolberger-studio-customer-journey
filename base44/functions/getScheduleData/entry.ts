import { meetingLabel } from '../../shared/meetingTypes.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    // Clone the request so we can read body AND pass original to SDK
    const cloned = req.clone();
    const { token } = await cloned.json();

    if (!token) {
      return Response.json({ error: 'Missing token' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Find meeting by scheduling_token (service role — public page, no auth)
    const meetings = await base44.asServiceRole.entities.Meeting.filter({ scheduling_token: token });
    const meeting = meetings[0];

    if (!meeting) {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }

    // Don't allow scheduling for completed/cancelled meetings
    if (meeting.status === 'completed' || meeting.status === 'cancelled') {
      return Response.json({ error: 'meeting_closed', status: meeting.status }, { status: 410 });
    }

    // Get client name
    const clients = await base44.asServiceRole.entities.Client.filter({ id: meeting.client_id });
    const client = clients[0];

    return Response.json({
      meeting_id: meeting.id,
      type: meeting.type,
      type_label: meetingLabel(meeting),
      duration: meeting.duration || 30,
      location: meeting.location || '',
      scheduled_at: meeting.scheduled_at || null,
      client_name: client?.name || '',
    });
  } catch (error) {
    console.error('getScheduleData error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});