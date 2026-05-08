// Automation A — Auto Lead Response
// Trigger: Client record_created with status=lead
// Action: Create Task for follow-up + Communication record (pending WhatsApp)
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, event } = await req.json();

    // Only trigger for new leads
    if (!data || data.status !== 'lead') {
      return Response.json({ skipped: true, reason: 'not a lead' });
    }

    const clientId = event.entity_id;
    const clientName = data.name || 'לקוח חדש';

    // Create follow-up task
    await base44.asServiceRole.entities.Task.create({
      title: `פנייה ראשונית — ${clientName}`,
      description: `ליד חדש נכנס. יש ליצור קשר תוך 30 דקות.`,
      type: 'followup',
      priority: 'high',
      status: 'open',
      client_id: clientId,
      due_date: new Date().toISOString().split('T')[0],
      auto_generated: true,
    });

    // Create pending WhatsApp communication (will be sent in Stage 5)
    await base44.asServiceRole.entities.Communication.create({
      client_id: clientId,
      type: 'whatsapp',
      direction: 'outbound',
      content: `שלום ${clientName}, תודה על הפנייה לסטודיו מיכל וולברגר! קיבלנו את הפרטים שלך ונחזור אליך בהקדם.`,
      sent_by: 'system',
      status: 'pending',
      channel: 'base44_native',
    });

    // Create intro meeting without date (will be synced to calendar when admin sets a date)
    await base44.asServiceRole.entities.Meeting.create({
      client_id: clientId,
      type: 'intro',
      status: 'scheduled',
      duration: 45,
    });

    // Update first_response_at
    await base44.asServiceRole.entities.Client.update(clientId, {
      first_response_at: new Date().toISOString(),
    });

    return Response.json({ success: true, automation: 'A', client: clientName });
  } catch (error) {
    // Log error to Communication
    try {
      const base44 = createClientFromRequest(req);
      const { event } = await req.json().catch(() => ({ event: {} }));
      await base44.asServiceRole.entities.Communication.create({
        client_id: event?.entity_id || '',
        type: 'system_error',
        direction: 'outbound',
        content: `Automation A (Auto Lead Response) failed: ${error.message}`,
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