// Automation G — Project Completion
// Trigger: Project record_updated (status changed to completed)
// Action: Update client status + generate portal token + Communication (pending NPS) + Task
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, old_data, event } = await req.json();

    if (!data || !old_data) return Response.json({ skipped: true });
    if (data.status !== 'completed' || old_data.status === 'completed') {
      return Response.json({ skipped: true, reason: 'not a completion event' });
    }

    const projectId = event.entity_id;
    const clientId = data.client_id;

    // Get client
    const clients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
    if (clients.length === 0) return Response.json({ skipped: true, reason: 'client not found' });
    const client = clients[0];

    // Update project end date
    await base44.asServiceRole.entities.Project.update(projectId, {
      end_date_actual: new Date().toISOString().split('T')[0],
    });

    // Check if client has other active projects
    const allProjects = await base44.asServiceRole.entities.Project.filter({ client_id: clientId });
    const hasOtherActive = allProjects.some(p => p.id !== projectId && (p.status === 'active' || p.status === 'on_hold'));

    if (!hasOtherActive) {
      // Update client status to completed
      const updates = { status: 'completed_client', completed_at: new Date().toISOString() };
      
      // Generate portal token if missing
      if (!client.portal_token) {
        const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
        updates.portal_token = token;
      }

      await base44.asServiceRole.entities.Client.update(clientId, updates);
    }

    // Send NPS/completion message
    await base44.asServiceRole.entities.Communication.create({
      client_id: clientId,
      project_id: projectId,
      type: 'whatsapp',
      direction: 'outbound',
      content: `שלום ${client.name}! 🎉 הפרויקט "${data.name}" הושלם! תודה רבה על שבחרת בסטודיו מיכל וולברגר. נשלח לך קישור לצפייה בכל החומרים ולדירוג החוויה.`,
      sent_by: 'system',
      status: 'pending',
      channel: 'base44_native',
    });

    // Create follow-up task
    await base44.asServiceRole.entities.Task.create({
      title: `פולואפ סיום — ${client.name}`,
      description: `הפרויקט "${data.name}" הושלם. שלח NPS ווידא שביעות רצון.`,
      type: 'followup',
      priority: 'normal',
      status: 'open',
      client_id: clientId,
      project_id: projectId,
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      auto_generated: true,
    });

    return Response.json({ success: true, automation: 'G', project: data.name });
  } catch (error) {
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.Communication.create({
        client_id: '',
        type: 'system_error',
        direction: 'outbound',
        content: `Automation G (Project Completion) failed: ${error.message}`,
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