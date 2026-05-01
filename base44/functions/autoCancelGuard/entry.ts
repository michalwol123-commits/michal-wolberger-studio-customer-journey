// PRD 3.3 — Projects Cancel Guard
// Trigger: Project updated to cancelled
// Action: Update Client status to on_hold + WhatsApp to michal + Communication log
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, old_data, event } = await req.json();

    if (!data || !old_data) return Response.json({ skipped: true });
    if (data.status !== 'cancelled' || old_data.status === 'cancelled') {
      return Response.json({ skipped: true, reason: 'not a cancellation event' });
    }

    const projectId = event.entity_id;
    const clientId = data.client_id;

    // Get client
    const clients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
    if (clients.length === 0) return Response.json({ skipped: true, reason: 'client not found' });
    const client = clients[0];

    // Update client status to on_hold (only if currently active)
    if (client.status === 'active_client') {
      await base44.asServiceRole.entities.Client.update(clientId, {
        status: 'active_client', // Keep active — they may have other projects
        last_valid_status: 'active_client',
      });
    }

    // WhatsApp notification to michal about cancellation
    await base44.asServiceRole.entities.Communication.create({
      client_id: clientId,
      project_id: projectId,
      type: 'whatsapp',
      direction: 'outbound',
      content: `⚠️ פרויקט "${data.name}" בוטל — בדקי לקוח ${client.name} (${client.phone})`,
      sent_by: 'system',
      status: 'pending',
      channel: 'base44_native',
    });

    // System log
    await base44.asServiceRole.entities.Communication.create({
      client_id: clientId,
      project_id: projectId,
      type: 'system_error',
      direction: 'outbound',
      content: `פרויקט "${data.name}" בוטל. סטטוס קודם: ${old_data.status}. לקוח: ${client.name}`,
      sent_by: 'system',
      status: 'sent',
      channel: 'base44_native',
    });

    return Response.json({ success: true, automation: 'CancelGuard', project: data.name });
  } catch (error) {
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.Communication.create({
        client_id: '',
        type: 'system_error',
        direction: 'outbound',
        content: `Cancel Guard failed: ${error.message}`,
        sent_by: 'system',
        status: 'failed',
        channel: 'base44_native',
        error_detail: error.message,
        retry_count: 0,
      });
    } catch (_) { /* silent */ }
    return Response.json({ error: error.message }, { status: 500 });
  }
});