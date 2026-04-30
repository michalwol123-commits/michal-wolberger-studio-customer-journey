// Automation: Create payment + reminder task when qualifying meeting is created
// Trigger: Meeting entity — create event, type = qualifying
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, event } = await req.json();

    if (!data) return Response.json({ skipped: true });
    if (data.type !== 'qualifying') {
      return Response.json({ skipped: true, reason: 'not qualifying meeting' });
    }

    const clientId = data.client_id;
    const projectId = data.project_id;
    const meetingDate = data.scheduled_at;

    // Check if a pending payment already exists for this project/client
    const existingPayments = projectId
      ? await base44.asServiceRole.entities.Payment.filter({ project_id: projectId, status: 'pending' })
      : [];

    const alreadyHasQualifyingPayment = existingPayments.some(
      p => p.milestone && p.milestone.includes('פגישת היכרות')
    );

    if (alreadyHasQualifyingPayment) {
      return Response.json({ skipped: true, reason: 'qualifying payment already exists' });
    }

    // Create payment milestone
    const dueDate = meetingDate
      ? new Date(new Date(meetingDate).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (projectId) {
      await base44.asServiceRole.entities.Payment.create({
        project_id: projectId,
        milestone: 'תשלום לפגישת היכרות',
        milestone_stage: 2,
        amount: 250,
        due_date: dueDate,
        status: 'pending',
      });
    }

    // Create reminder task
    await base44.asServiceRole.entities.Task.create({
      title: 'תזכורת תשלום לפגישת היכרות — ₪250',
      description: `יש לוודא תשלום ₪250 לפני פגישת ההיכרות.`,
      type: 'payment_reminder',
      priority: 'high',
      status: 'open',
      client_id: clientId,
      project_id: projectId || undefined,
      related_stage: 2,
      due_date: dueDate,
      auto_generated: true,
    });

    // Log communication
    const clients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
    const clientName = clients[0]?.name || 'לקוח';

    await base44.asServiceRole.entities.Communication.create({
      client_id: clientId,
      project_id: projectId || undefined,
      type: 'note',
      direction: 'outbound',
      content: `נוצר תשלום ₪250 לפגישת היכרות עבור ${clientName}. תאריך יעד: ${dueDate}`,
      sent_by: 'system',
      status: 'sent',
      channel: 'base44_native',
    });

    return Response.json({ success: true, payment_due: dueDate });
  } catch (error) {
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.Communication.create({
        client_id: '',
        type: 'system_error',
        direction: 'outbound',
        content: `autoQualifyingPayment failed: ${error.message}`,
        sent_by: 'system',
        status: 'failed',
        channel: 'base44_native',
        error_detail: error.message,
      });
    } catch (_) { /* silent */ }
    return Response.json({ error: error.message }, { status: 500 });
  }
});