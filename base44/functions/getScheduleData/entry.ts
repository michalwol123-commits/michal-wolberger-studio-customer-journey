import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'Missing token' }, { status: 400 });
    }

    // Find meeting by scheduling_token (service role — no auth needed)
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
    const client = await base44.asServiceRole.entities.Client.get(meeting.client_id);

    const MEETING_TYPE_LABELS = {
      intro: 'פגישת היכרות',
      qualifying: 'פגישת סינון',
      quote_presentation: 'הצגת הצעת מחיר',
      stage_review: 'סקירת שלב',
      site_visit: 'ביקור באתר',
      zoom: 'פגישת זום',
      design_approval: 'אישור עיצוב',
    };

    return Response.json({
      meeting_id: meeting.id,
      type: meeting.type,
      type_label: MEETING_TYPE_LABELS[meeting.type] || meeting.type,
      duration: meeting.duration || 45,
      location: meeting.location || '',
      scheduled_at: meeting.scheduled_at || null,
      client_name: client?.name || '',
    });
  } catch (error) {
    console.error('getScheduleData error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});