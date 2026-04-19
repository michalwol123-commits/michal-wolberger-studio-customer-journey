// Automation J — Quote Approved → Create Project + Payments
// Trigger: Quote record_updated (status changed to approved)
// Action: Create Project + Payment milestones + Update client status + Portal token
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, old_data, event } = await req.json();

    if (!data || !old_data) return Response.json({ skipped: true });
    if (data.status !== 'approved' || old_data.status === 'approved') {
      return Response.json({ skipped: true, reason: 'not an approval event' });
    }

    const quoteId = event.entity_id;
    const clientId = data.client_id;

    // Get client
    const clients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
    if (clients.length === 0) return Response.json({ skipped: true, reason: 'client not found' });
    const client = clients[0];

    // Create project
    const project = await base44.asServiceRole.entities.Project.create({
      client_id: clientId,
      name: data.title || `פרויקט — ${client.name}`,
      status: 'active',
      stage_current: 1,
      progress: 0,
      total_budget: data.total_amount || 0,
      start_date: new Date().toISOString().split('T')[0],
    });

    // Create default payment milestones (3 payments: advance 40%, mid 30%, final 30%)
    const totalAmount = data.total_amount || 0;
    const milestones = [
      { milestone: 'מקדמה', amount: Math.round(totalAmount * 0.4), milestone_stage: 1, daysOffset: 7 },
      { milestone: 'תשלום אמצע', amount: Math.round(totalAmount * 0.3), milestone_stage: 5, daysOffset: 60 },
      { milestone: 'תשלום סיום', amount: Math.round(totalAmount * 0.3), milestone_stage: 9, daysOffset: 120 },
    ];

    for (const ms of milestones) {
      const dueDate = new Date(Date.now() + ms.daysOffset * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await base44.asServiceRole.entities.Payment.create({
        project_id: project.id,
        milestone: ms.milestone,
        milestone_stage: ms.milestone_stage,
        amount: ms.amount,
        amount_paid: 0,
        due_date: dueDate,
        status: 'pending',
      });
    }

    // Update client status step by step to respect state machine
    // First: move to proposal_approved if currently in proposal_sent
    if (client.status === 'proposal_sent') {
      await base44.asServiceRole.entities.Client.update(clientId, { status: 'proposal_approved' });
    }
    // Then: move to active_client + generate portal token if missing
    const clientUpdates = { status: 'active_client' };
    if (!client.portal_token) {
      clientUpdates.portal_token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    }
    await base44.asServiceRole.entities.Client.update(clientId, clientUpdates);

    // Notify client
    await base44.asServiceRole.entities.Communication.create({
      client_id: clientId,
      project_id: project.id,
      type: 'whatsapp',
      direction: 'outbound',
      content: `שלום ${client.name}! ההצעה אושרה ופרויקט "${project.name}" נפתח! 🎉 נשלח לך בקרוב קישור לפורטל האישי שלך לצפייה בהתקדמות.`,
      sent_by: 'system',
      status: 'pending',
      channel: 'base44_native',
    });

    return Response.json({ success: true, automation: 'J', projectId: project.id });
  } catch (error) {
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.Communication.create({
        client_id: '',
        type: 'system_error',
        direction: 'outbound',
        content: `Automation J (Quote Approval) failed: ${error.message}`,
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