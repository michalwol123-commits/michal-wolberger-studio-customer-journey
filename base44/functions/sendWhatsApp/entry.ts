// WhatsApp Sender via Green API
// Trigger: entity automation on Communication create/update (status=pending, type=whatsapp)
// Per-record atomic claim (pending -> sending -> sent/failed) prevents duplicate sends.
// Stale recovery: records stuck in 'sending' over 10 minutes are reset to pending.
// TEMPORARY WHITELIST: only sends to ALLOWED_PHONES. Remove whitelist check when ready to open up.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// =============================================
// TEMPORARY WHITELIST — remove this array and the check below when ready to send to all
// =============================================
const ALLOWED_PHONES = ['0546999915', '0524687812', '0544535688', '0535334449'];

// =============================================
// SIMULATION MODE — set to false to resume real sending via Green API
// While true: messages are logged as 'sent' in Communications but NOT actually sent.
// =============================================
const SIMULATION_MODE = true;

const STALE_SENDING_MS = 10 * 60 * 1000; // 10 minutes

function normalizeToE164(phone) {
  const digits = String(phone || '').replace(/[\s\-\.\(\)\+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0')) return `972${digits.substring(1)}`;
  if (digits.length === 9 && digits.startsWith('5')) return `972${digits}`;
  return digits;
}

function isAllowed(phone) {
  // TEMPORARY: only send to whitelisted numbers
  // To open up to all, remove this function and its call below
  const normalized = normalizeToE164(phone);
  return ALLOWED_PHONES.some(p => normalizeToE164(p) === normalized);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const GREEN_ID = (Deno.env.get('GREEN_ID') || '').trim();
    const GREEN_TOKEN = (Deno.env.get('GREEN_TOKEN') || '').trim();

    if (!GREEN_ID || !GREEN_TOKEN) {
      return Response.json({ skipped: true, reason: 'GREEN_ID or GREEN_TOKEN not configured' });
    }

    // === Stale recovery: reset records stuck in 'sending' over 10 minutes back to 'pending' ===
    const stuck = await base44.asServiceRole.entities.Communication.filter({
      type: 'whatsapp',
      status: 'sending',
      direction: 'outbound',
    });
    let recovered = 0;
    const now = Date.now();
    for (const s of stuck) {
      const age = now - new Date(s.updated_date).getTime();
      if (age > STALE_SENDING_MS) {
        // atomic: only reset if still 'sending'
        const r = await base44.asServiceRole.entities.Communication.updateMany(
          { id: s.id, status: 'sending' },
          { $set: { status: 'pending', retry_count: (s.retry_count || 0) + 1 } }
        );
        if (r.updated > 0) recovered++;
      }
    }

    const pending = await base44.asServiceRole.entities.Communication.filter({
      type: 'whatsapp',
      status: 'pending',
      direction: 'outbound',
    });

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const comm of pending) {
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

      const clientPhone = clients[0].phone;

      // TEMPORARY WHITELIST CHECK — remove when ready to send to all
      if (!isAllowed(clientPhone)) {
        console.log(`⏭️ Skipping ${clientPhone} — not in whitelist (warming up)`);
        skipped++;
        continue; // leave status=pending, will send when whitelist is removed
      }

      // === Atomic claim: pending -> sending. If another run already claimed it, skip. ===
      const claim = await base44.asServiceRole.entities.Communication.updateMany(
        { id: comm.id, status: 'pending' },
        { $set: { status: 'sending' } }
      );
      if (!claim.updated) {
        console.log(`🔒 ${comm.id} already claimed by a parallel run — skipping`);
        skipped++;
        continue;
      }

      // SIMULATION MODE — log only, don't actually send
      if (SIMULATION_MODE) {
        await base44.asServiceRole.entities.Communication.update(comm.id, {
          status: 'sent',
          channel: 'base44_native',
          error_detail: 'SIMULATION — לא נשלח בפועל',
        });
        sent++;
        continue;
      }

      const chatId = `${normalizeToE164(clientPhone)}@c.us`;

      try {
        const response = await fetch(
          `https://7107.api.greenapi.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, message: comm.content }),
          }
        );
        const result = await response.json();

        if (response.ok && result.idMessage) {
          await base44.asServiceRole.entities.Communication.update(comm.id, {
            status: 'sent',
            channel: 'base44_native',
          });
          sent++;
        } else {
          await base44.asServiceRole.entities.Communication.update(comm.id, {
            status: 'failed',
            error_detail: `Green API error: ${JSON.stringify(result).slice(0, 300)}`,
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

    return Response.json({ success: true, sent, failed, skipped, recovered, total: pending.length });
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