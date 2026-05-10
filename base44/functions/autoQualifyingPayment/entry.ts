// Automation: Create payment + reminder + prep tasks when client moves to qualified (after intro meeting)
// Trigger: Client entity — update event, status changed to "qualified"
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, old_data, event } = await req.json();

    if (!data || !old_data || !event) return Response.json({ skipped: true });

    // Only fire when status changed TO qualified
    if (data.status !== 'qualified' || old_data.status === 'qualified') {
      return Response.json({ skipped: true, reason: 'not a transition to qualified' });
    }

    const clientId = event.entity_id;
    const clientName = data.name || 'לקוח';

    // Check if a qualifying payment already exists for this client
    const existingPayments = await base44.asServiceRole.entities.Payment.filter({ client_id: clientId });
    const alreadyHasQualifyingPayment = existingPayments.some(
      p => p.milestone && p.milestone.includes('פגישת הצעת מחיר')
    );

    if (alreadyHasQualifyingPayment) {
      return Response.json({ skipped: true, reason: 'qualifying payment already exists' });
    }

    // Due date = 3 days from now
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Create payment for quote presentation meeting (stage 3)
    await base44.asServiceRole.entities.Payment.create({
      client_id: clientId,
      milestone: 'תשלום לפגישת הצעת מחיר',
      milestone_stage: 3,
      amount: 250,
      due_date: dueDate,
      status: 'pending',
    });

    // Create payment reminder task
    await base44.asServiceRole.entities.Task.create({
      title: 'תזכורת תשלום לפגישת הצעת מחיר — ₪250',
      description: `יש לוודא תשלום ₪250 עבור ${clientName} לפני פגישת הצעת המחיר.`,
      type: 'payment_reminder',
      priority: 'high',
      status: 'open',
      client_id: clientId,
      due_date: dueDate,
      auto_generated: true,
    });

    // Create task: prepare quote for client
    await base44.asServiceRole.entities.Task.create({
      title: `הכנת הצעת מחיר — ${clientName}`,
      description: `יש להכין הצעת מחיר עבור ${clientName} לקראת פגישת הצעת המחיר.`,
      type: 'manual',
      priority: 'high',
      status: 'open',
      client_id: clientId,
      due_date: dueDate,
      auto_generated: true,
    });

    // Log internal communication
    await base44.asServiceRole.entities.Communication.create({
      client_id: clientId,
      type: 'note',
      direction: 'outbound',
      content: `נוצר תשלום ₪250 לפגישת הצעת מחיר עבור ${clientName}. תאריך יעד: ${dueDate}`,
      sent_by: 'system',
      status: 'sent',
      channel: 'base44_native',
    });

    // Send payment reminder email to client
    if (data.email) {
      await base44.asServiceRole.entities.Communication.create({
        client_id: clientId,
        type: 'email',
        direction: 'outbound',
        content: `שלום ${clientName},\n\nתודה שבחרת בסטודיו מיכל וולברגר!\n\nלפני פגישת הצעת המחיר שלנו, יש לבצע תשלום של ₪250.\n\nתאריך יעד לתשלום: ${dueDate}\n\nנשמח לראותך!\nמיכל וולברגר - עיצוב פנים`,
        sent_by: 'system',
        status: 'pending',
        channel: 'base44_native',
      });
    }

    // Send WhatsApp reminder if phone exists
    if (data.phone) {
      await base44.asServiceRole.entities.Communication.create({
        client_id: clientId,
        type: 'whatsapp',
        direction: 'outbound',
        content: `שלום ${clientName} 👋\n\nתודה שבחרת בסטודיו מיכל וולברגר!\n\nלפני פגישת הצעת המחיר, נא לבצע תשלום של ₪250 עד ${dueDate}.\n\nנשמח לראותך! 🏡\nמיכל`,
        sent_by: 'system',
        status: 'pending',
        channel: 'base44_native',
      });
    }

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