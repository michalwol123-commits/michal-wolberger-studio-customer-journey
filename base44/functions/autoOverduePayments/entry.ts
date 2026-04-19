// Automation F — Overdue Payment Detection
// Trigger: Scheduled (daily at 08:00)
// Condition: Payment status=pending AND due_date < today
// Action: Update to overdue + Task + Communication
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const todayStr = new Date().toISOString().split('T')[0];

    const payments = await base44.asServiceRole.entities.Payment.filter({ status: 'pending' });
    let actioned = 0;

    for (const payment of payments) {
      if (!payment.due_date || payment.due_date >= todayStr) continue;

      // Mark as overdue
      await base44.asServiceRole.entities.Payment.update(payment.id, { status: 'overdue' });

      // Get project → client
      const projects = await base44.asServiceRole.entities.Project.filter({ id: payment.project_id });
      if (projects.length === 0) continue;
      const clientId = projects[0].client_id;

      const clients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
      const clientName = clients[0]?.name || 'לקוח';

      await base44.asServiceRole.entities.Task.create({
        title: `תשלום באיחור — ${payment.milestone}`,
        description: `₪${(payment.amount || 0).toLocaleString()} מ-${clientName} באיחור מ-${payment.due_date}`,
        type: 'payment_reminder',
        priority: 'urgent',
        status: 'open',
        client_id: clientId,
        project_id: payment.project_id,
        due_date: todayStr,
        auto_generated: true,
      });

      await base44.asServiceRole.entities.Communication.create({
        client_id: clientId,
        type: 'whatsapp',
        direction: 'outbound',
        content: `שלום ${clientName}, תשלום של ₪${(payment.amount || 0).toLocaleString()} עבור ${payment.milestone} עבר את מועד התשלום. נשמח להסדיר — תודה!`,
        sent_by: 'system',
        status: 'pending',
        channel: 'base44_native',
      });

      actioned++;
    }

    return Response.json({ success: true, automation: 'F', actioned });
  } catch (error) {
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.Communication.create({
        client_id: '',
        type: 'system_error',
        direction: 'outbound',
        content: `Automation F (Overdue Payments) failed: ${error.message}`,
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