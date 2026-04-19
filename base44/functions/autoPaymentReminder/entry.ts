// Automation C — Payment Reminder (3 days before due)
// Trigger: Scheduled (daily at 09:00)
// Condition: Payment status=pending AND due_date within 3 days
// Action: Task + Communication (pending)
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const todayStr = now.toISOString().split('T')[0];
    const thresholdStr = threeDaysLater.toISOString().split('T')[0];

    const payments = await base44.asServiceRole.entities.Payment.filter({ status: 'pending' });
    let actioned = 0;

    for (const payment of payments) {
      if (!payment.due_date) continue;
      if (payment.due_date > thresholdStr || payment.due_date < todayStr) continue;
      if (payment.reminder_sent) continue;

      // Get project → client
      const projects = await base44.asServiceRole.entities.Project.filter({ id: payment.project_id });
      if (projects.length === 0) continue;
      const project = projects[0];

      const clients = await base44.asServiceRole.entities.Client.filter({ id: project.client_id });
      const clientName = clients[0]?.name || 'לקוח';
      const clientId = project.client_id;

      await base44.asServiceRole.entities.Task.create({
        title: `תזכורת תשלום — ${payment.milestone}`,
        description: `תשלום ₪${(payment.amount || 0).toLocaleString()} מגיע בתאריך ${payment.due_date}. לקוח: ${clientName}`,
        type: 'payment_reminder',
        priority: 'high',
        status: 'open',
        client_id: clientId,
        project_id: payment.project_id,
        due_date: payment.due_date,
        auto_generated: true,
      });

      await base44.asServiceRole.entities.Communication.create({
        client_id: clientId,
        type: 'whatsapp',
        direction: 'outbound',
        content: `שלום ${clientName}, תזכורת: תשלום של ₪${(payment.amount || 0).toLocaleString()} עבור ${payment.milestone} מגיע בתאריך ${payment.due_date}.`,
        sent_by: 'system',
        status: 'pending',
        channel: 'base44_native',
      });

      // Mark reminder sent
      await base44.asServiceRole.entities.Payment.update(payment.id, { reminder_sent: true });
      actioned++;
    }

    return Response.json({ success: true, automation: 'C', actioned });
  } catch (error) {
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.Communication.create({
        client_id: '',
        type: 'system_error',
        direction: 'outbound',
        content: `Automation C (Payment Reminder) failed: ${error.message}`,
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