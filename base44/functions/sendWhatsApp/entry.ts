// Stage 5 — WhatsApp Sender via 360dialog API
// Trigger: Scheduled every 1 minute
// Picks up Communication where type=whatsapp, status=pending, direction=outbound
// Sends via 360dialog API, updates status to sent/failed
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DIALOG360_API_URL = 'https://waba.360dialog.io/v1/messages';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const apiKey = Deno.env.get('DIALOG360_API_KEY');

    if (!apiKey) {
      return Response.json({ skipped: true, reason: 'DIALOG360_API_KEY not configured' });
    }

    const pending = await base44.asServiceRole.entities.Communication.filter({
      type: 'whatsapp',
      status: 'pending',
      direction: 'outbound',
    });

    let sent = 0;
    let failed = 0;

    for (const comm of pending) {
      // Get client phone number
      if (!comm.client_id) {
        await base44.asServiceRole.entities.Communication.update(comm.id, {
          status: 'failed',
          error_detail: 'No client_id',
        });
        failed++;
        continue;
      }

      const clients = await base44.asServiceRole.entities.Client.filter({ id: comm.client_id });
      if (clients.length === 0 || !clients[0].phone) {
        await base44.asServiceRole.entities.Communication.update(comm.id, {
          status: 'failed',
          error_detail: 'Client not found or no phone number',
        });
        failed++;
        continue;
      }

      const phone = clients[0].phone.replace(/[^0-9+]/g, '');
      // Normalize: ensure starts with country code (no +)
      const normalizedPhone = phone.startsWith('+') ? phone.slice(1) : phone;

      // Send as free-form text message (session message)
      // For template messages, use the template format below
      const payload = {
        messaging_product: 'whatsapp',
        to: normalizedPhone,
        type: 'text',
        text: { body: comm.content },
      };

      try {
        const response = await fetch(DIALOG360_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'D360-API-KEY': apiKey,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          await base44.asServiceRole.entities.Communication.update(comm.id, {
            status: 'sent',
            channel: 'base44_native',
          });
          sent++;
        } else {
          const errorBody = await response.text();
          await base44.asServiceRole.entities.Communication.update(comm.id, {
            status: 'failed',
            error_detail: `360dialog ${response.status}: ${errorBody.slice(0, 300)}`,
          });
          failed++;
        }
      } catch (fetchErr) {
        await base44.asServiceRole.entities.Communication.update(comm.id, {
          status: 'failed',
          error_detail: `Network error: ${fetchErr.message}`,
        });
        failed++;
      }
    }

    return Response.json({ success: true, sent, failed, total: pending.length });
  } catch (error) {
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.Communication.create({
        client_id: '',
        type: 'system_error',
        direction: 'outbound',
        content: `WhatsApp Sender failed: ${error.message}`,
        sent_by: 'system',
        status: 'failed',
        channel: 'base44_native',
        error_detail: error.message,
        retry_count: 99,
      });
    } catch (_) { /* silent */ }
    return Response.json({ error: error.message }, { status: 500 });
  }
});