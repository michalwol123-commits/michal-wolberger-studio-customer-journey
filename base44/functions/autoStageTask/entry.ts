// Automation: Stage-based task creation + client status updates
// Triggers on Project update when s*_status fields change
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, old_data, event } = await req.json();

    if (!data || !old_data) return Response.json({ skipped: true });

    const projectId = event.entity_id;
    const clientId = data.client_id;
    const actions = [];

    // --- s2_status → completed: Create "prepare quote" task ---
    if (data.s2_status === 'completed' && old_data.s2_status !== 'completed') {
      await base44.asServiceRole.entities.Task.create({
        title: 'הכנת הצעת מחיר',
        description: `הפרויקט "${data.name}" סיים שלב שיחת היכרות. יש להכין הצעת מחיר ללקוח.`,
        type: 'followup',
        priority: 'high',
        status: 'open',
        client_id: clientId,
        project_id: projectId,
        related_stage: 3,
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        auto_generated: true,
      });
      actions.push('created_quote_task');
    }

    // --- s5_status → completed: Update client to qualified ---
    if (data.s5_status === 'completed' && old_data.s5_status !== 'completed') {
      const clients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
      const client = clients[0];
      if (client && client.status === 'lead') {
        await base44.asServiceRole.entities.Client.update(clientId, {
          status: 'qualified',
          qualified_at: new Date().toISOString(),
        });
        actions.push('client_qualified');
      }
    }

    if (actions.length === 0) {
      return Response.json({ skipped: true, reason: 'no matching stage change' });
    }

    return Response.json({ success: true, actions });
  } catch (error) {
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.Communication.create({
        client_id: '',
        type: 'system_error',
        direction: 'outbound',
        content: `autoStageTask failed: ${error.message}`,
        sent_by: 'system',
        status: 'failed',
        channel: 'base44_native',
        error_detail: error.message,
      });
    } catch (_) { /* silent */ }
    return Response.json({ error: error.message }, { status: 500 });
  }
});