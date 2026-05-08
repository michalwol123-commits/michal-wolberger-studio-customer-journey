// Automation: When a quote_presentation meeting is completed,
// update the client status to "proposal_presented"
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, old_data, event } = await req.json();

    if (!data || !old_data || !event) return Response.json({ skipped: true });

    // Only fire when status changed TO completed
    if (data.status !== 'completed' || old_data.status === 'completed') {
      return Response.json({ skipped: true, reason: 'not a transition to completed' });
    }

    // Only for quote_presentation meetings
    if (data.type !== 'quote_presentation') {
      return Response.json({ skipped: true, reason: 'not a quote_presentation meeting' });
    }

    const clientId = data.client_id;
    if (!clientId) return Response.json({ skipped: true, reason: 'no client_id' });

    // Fetch the client to check current status
    const clients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
    if (clients.length === 0) return Response.json({ error: 'Client not found' }, { status: 404 });
    const client = clients[0];

    // Only update if client is in qualified_assessment status
    if (client.status === 'qualified_assessment') {
      await base44.asServiceRole.entities.Client.update(clientId, {
        status: 'proposal_presented',
      });

      // Log communication
      await base44.asServiceRole.entities.Communication.create({
        client_id: clientId,
        type: 'note',
        direction: 'outbound',
        content: `פגישת הצגת הצעת מחיר הושלמה עם ${client.name}. סטטוס הלקוח עודכן ל"הוגשה בפגישה".`,
        sent_by: 'system',
        status: 'sent',
        channel: 'base44_native',
      });
    }

    return Response.json({ success: true, client_status_updated: client.status === 'qualified_assessment' });
  } catch (error) {
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.Communication.create({
        client_id: '',
        type: 'system_error',
        direction: 'outbound',
        content: `autoQuoteMeetingCompleted failed: ${error.message}`,
        sent_by: 'system',
        status: 'failed',
        channel: 'base44_native',
        error_detail: error.message,
      });
    } catch (_) { /* silent */ }
    return Response.json({ error: error.message }, { status: 500 });
  }
});