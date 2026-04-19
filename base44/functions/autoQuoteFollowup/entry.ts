// Automation B — Quote Follow-up (48h after sent, not viewed)
// Trigger: Scheduled (every 30 min)
// Condition: Quote status=sent AND sent_at > 48h ago AND not viewed
// Action: Task + Communication (pending)
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const threshold = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const quotes = await base44.asServiceRole.entities.Quote.filter({ status: 'sent' });
    let actioned = 0;

    for (const quote of quotes) {
      if (!quote.sent_at) continue;
      const sentDate = new Date(quote.sent_at);
      if (sentDate > threshold) continue; // Not yet 48h
      if (quote.viewed_at) continue; // Already viewed

      // Check if we already created a follow-up task for this quote
      const existingTasks = await base44.asServiceRole.entities.Task.filter({
        client_id: quote.client_id,
        type: 'followup',
        title: `מעקב הצעת מחיר — ${quote.title}`,
      });
      if (existingTasks.length > 0) continue;

      // Get client name
      const clients = await base44.asServiceRole.entities.Client.filter({ id: quote.client_id });
      const clientName = clients[0]?.name || 'לקוח';

      await base44.asServiceRole.entities.Task.create({
        title: `מעקב הצעת מחיר — ${quote.title}`,
        description: `הצעה נשלחה לפני 48+ שעות ולא נצפתה. יש לעקוב עם ${clientName}.`,
        type: 'followup',
        priority: 'high',
        status: 'open',
        client_id: quote.client_id,
        due_date: new Date().toISOString().split('T')[0],
        auto_generated: true,
      });

      await base44.asServiceRole.entities.Communication.create({
        client_id: quote.client_id,
        type: 'whatsapp',
        direction: 'outbound',
        content: `שלום ${clientName}, שלחנו לך הצעת מחיר — רצינו לוודא שקיבלת. נשמח לענות על כל שאלה!`,
        sent_by: 'system',
        status: 'pending',
        channel: 'base44_native',
      });

      actioned++;
    }

    return Response.json({ success: true, automation: 'B', actioned });
  } catch (error) {
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.Communication.create({
        client_id: '',
        type: 'system_error',
        direction: 'outbound',
        content: `Automation B (Quote Follow-up) failed: ${error.message}`,
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