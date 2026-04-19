// Stage 5 — Email Sender via Base44 native SendEmail
// Trigger: Scheduled every 5 minutes
// Picks up Communication where type=email, status=pending, direction=outbound
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const pending = await base44.asServiceRole.entities.Communication.filter({
      type: 'email',
      status: 'pending',
      direction: 'outbound',
    });

    let sent = 0;
    let failed = 0;

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
      if (clients.length === 0 || !clients[0].email) {
        await base44.asServiceRole.entities.Communication.update(comm.id, {
          status: 'failed',
          error_detail: 'Client not found or no email',
        });
        failed++;
        continue;
      }

      const client = clients[0];
      const subject = comm.content?.slice(0, 60) || 'עדכון מסטודיו מיכל וולברגר';

      const htmlBody = `
        <div dir="rtl" style="font-family: 'Heebo', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #faf8f5; border-radius: 12px; overflow: hidden;">
          <div style="background: #8b7355; padding: 20px 30px; text-align: center;">
            <h1 style="color: #faf8f5; margin: 0; font-size: 22px;">סטודיו מיכל וולברגר</h1>
            <p style="color: #d4c5b0; margin: 4px 0 0; font-size: 13px;">עיצוב פנים</p>
          </div>
          <div style="padding: 30px; background: #ffffff;">
            <p style="font-size: 15px; line-height: 1.8; color: #2c2c2c;">${(comm.content || '').replace(/\n/g, '<br>')}</p>
          </div>
          <div style="padding: 16px 30px; background: #f5f0ea; text-align: center; font-size: 12px; color: #999;">
            <p style="margin: 0;">סטודיו מיכל וולברגר | עיצוב פנים</p>
            <p style="margin: 4px 0 0;">הודעה זו נשלחה אוטומטית</p>
          </div>
        </div>
      `;

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: client.email,
          subject: subject,
          body: htmlBody,
          from_name: 'סטודיו מיכל וולברגר',
        });

        await base44.asServiceRole.entities.Communication.update(comm.id, {
          status: 'sent',
        });
        sent++;
      } catch (emailErr) {
        await base44.asServiceRole.entities.Communication.update(comm.id, {
          status: 'failed',
          error_detail: `Email send error: ${emailErr.message}`,
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
        content: `Email Sender failed: ${error.message}`,
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