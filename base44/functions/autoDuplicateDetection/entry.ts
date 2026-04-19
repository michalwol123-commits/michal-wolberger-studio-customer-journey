// Automation H — Duplicate Lead Detection
// Trigger: Client record_created
// Condition: Existing client with same phone or email
// Action: Set duplicate_of + Communication alert
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, event } = await req.json();

    if (!data) return Response.json({ skipped: true });

    const newClientId = event.entity_id;
    const phone = data.phone;
    const email = data.email;

    // Search for existing clients with same phone
    let duplicateOf = null;

    if (phone) {
      const byPhone = await base44.asServiceRole.entities.Client.filter({ phone });
      const existing = byPhone.find(c => c.id !== newClientId);
      if (existing) duplicateOf = existing;
    }

    if (!duplicateOf && email) {
      const byEmail = await base44.asServiceRole.entities.Client.filter({ email });
      const existing = byEmail.find(c => c.id !== newClientId);
      if (existing) duplicateOf = existing;
    }

    if (!duplicateOf) {
      return Response.json({ success: true, automation: 'H', duplicate: false });
    }

    // Mark as duplicate
    await base44.asServiceRole.entities.Client.update(newClientId, {
      duplicate_of: duplicateOf.id,
    });

    // Create alert
    await base44.asServiceRole.entities.Communication.create({
      client_id: newClientId,
      type: 'system_error',
      direction: 'outbound',
      content: `⚠️ זוהה ליד כפול: "${data.name}" (${phone || email}) — ככל הנראה זהה ל-"${duplicateOf.name}" (ID: ${duplicateOf.id})`,
      sent_by: 'system',
      status: 'sent',
      channel: 'base44_native',
    });

    return Response.json({ success: true, automation: 'H', duplicate: true, duplicateOf: duplicateOf.id });
  } catch (error) {
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.Communication.create({
        client_id: '',
        type: 'system_error',
        direction: 'outbound',
        content: `Automation H (Duplicate Detection) failed: ${error.message}`,
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