// Called from frontend when intro meeting is completed
// Action: "continue" → update client to qualified, create quote_presentation meeting, trigger qualifying payment flow
// Action: "not_interested" → archive client
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meetingId, action } = await req.json();
    if (!meetingId || !action) {
      return Response.json({ error: 'Missing meetingId or action' }, { status: 400 });
    }

    // Get the meeting
    const meetings = await base44.asServiceRole.entities.Meeting.filter({ id: meetingId });
    const meeting = meetings[0];
    if (!meeting) {
      return Response.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Get the client
    const clients = await base44.asServiceRole.entities.Client.filter({ id: meeting.client_id });
    const client = clients[0];
    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    const clientName = client.name || 'לקוח';

    // Mark the intro meeting as completed
    await base44.asServiceRole.entities.Meeting.update(meetingId, { status: 'completed' });

    if (action === 'continue') {
      // Update client status to qualified (מתעניין)
      await base44.asServiceRole.entities.Client.update(client.id, { status: 'qualified' });

      // Create quote presentation meeting
      await base44.asServiceRole.entities.Meeting.create({
        client_id: client.id,
        type: 'quote_presentation',
        status: 'scheduled',
        duration: 60,
      });

      // Log communication
      await base44.asServiceRole.entities.Communication.create({
        client_id: client.id,
        type: 'note',
        direction: 'outbound',
        content: `פגישת היכרות הושלמה — ${clientName} ממשיך. נפתחה פגישת הצגת הצעה.`,
        sent_by: 'system',
        status: 'sent',
        channel: 'base44_native',
      });

      return Response.json({ success: true, action: 'continue', clientName });

    } else if (action === 'not_interested') {
      // Archive the client
      await base44.asServiceRole.entities.Client.update(client.id, { status: 'archived' });

      // Log communication
      await base44.asServiceRole.entities.Communication.create({
        client_id: client.id,
        type: 'note',
        direction: 'outbound',
        content: `פגישת היכרות הושלמה — ${clientName} לא ממשיך. הועבר לארכיון.`,
        sent_by: 'system',
        status: 'sent',
        channel: 'base44_native',
      });

      return Response.json({ success: true, action: 'not_interested', clientName });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});