// Automation: Send signature link when Quote status changes to
// 'sent_for_signature' (הצעה) or 'contract_sent_for_signature' (הסכם)
// Finds (or creates) the pending signature Document, then sends
// styled email via Brevo + queues WhatsApp per quote.send_via.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TARGETS = {
  sent_for_signature: { docType: 'quote', pdfPart: 'quote', label: 'הצעת מחיר' },
  contract_sent_for_signature: { docType: 'contract', pdfPart: 'full', label: 'הסכם' },
};

function makeToken() {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, old_data, event } = await req.json();

    if (!data || !old_data || !event) return Response.json({ skipped: true });

    const target = TARGETS[data.status];
    if (!target || old_data.status === data.status) {
      return Response.json({ skipped: true, reason: 'not a signature status transition' });
    }

    const quoteId = event.entity_id;
    const clientId = data.client_id;
    if (!clientId) return Response.json({ skipped: true, reason: 'no client_id' });

    const clients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
    if (clients.length === 0) return Response.json({ error: 'Client not found' }, { status: 404 });
    const client = clients[0];
    const clientName = client.name || 'לקוח/ה';
    const title = data.title || 'הצעת מחיר';
    const sendVia = data.send_via || 'email';

    // === Find latest pending signature Document for this quote+type ===
    const docs = await base44.asServiceRole.entities.Document.filter({ quote_id: quoteId, type: target.docType });
    let doc = docs
      .filter(d => d.signature_status === 'pending_signature' && d.signature_token)
      .sort((a, b) =>
        (b.version_number || 1) - (a.version_number || 1) ||
        new Date(b.created_date || 0) - new Date(a.created_date || 0)
      )[0];

    // === Not found (manual status change) — generate PDF + Document ===
    if (!doc) {
      console.log('No pending signature doc found — generating PDF...');
      const pdfResult = await base44.asServiceRole.functions.invoke('generateQuotePDF', {
        client_id: clientId,
        quote_id: quoteId,
        total_amount: data.total_amount,
        meeting_date: data.meeting_date,
        part: target.pdfPart,
      });
      const fileUrl = pdfResult?.data?.file_url;
      if (!fileUrl) throw new Error('PDF generation failed: ' + (pdfResult?.data?.error || 'unknown'));

      doc = await base44.asServiceRole.entities.Document.create({
        name: `${target.label} - ${clientName}`,
        type: target.docType,
        file_url: fileUrl,
        client_id: clientId,
        quote_id: quoteId,
        stage: target.docType === 'contract' ? 4 : undefined,
        visible_to_client: true,
        version_number: 1,
        signature_token: makeToken(),
        signature_status: 'pending_signature',
      });
    }

    const appUrl = 'https://michal-design-flow.base44.app';
    const signUrl = `${appUrl}/sign?token=${doc.signature_token}`;
    const results = [];

    // === Email via Brevo ===
    if (sendVia === 'email' || sendVia === 'both') {
      if (client.email) {
        const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
        const subject = `${target.label} לחתימה — ${title}`;
        const htmlBody = `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#8B7355;padding:32px;text-align:center;color:white;">
            <h1 style="margin:0;font-size:22px;">סטודיו מיכל וולברגר</h1>
            <p style="margin:8px 0 0;font-size:13px;opacity:0.85;">עיצוב פנים</p>
          </div>
          <div style="padding:32px;background:white;border:1px solid #e8e0d5;border-top:none;">
            <p>שלום ${clientName},</p>
            <p>${target.label === 'הסכם' ? 'ההצעה וההסכם' : 'הצעת המחיר'} <strong>"${title}"</strong> ממתינים לחתימתך הדיגיטלית.</p>
            <p style="margin-top:24px;text-align:center;">
              <a href="${signUrl}" style="background:#8B7355;color:white;padding:14px 32px;text-decoration:none;border-radius:8px;display:inline-block;font-size:16px;">
                ✍️ לצפייה וחתימה על המסמך
              </a>
            </p>
            <p style="color:#999;font-size:12px;margin-top:16px;">הקישור: ${signUrl}</p>
            <p style="margin-top:24px;">בברכה,<br/>מיכל וולברגר - עיצוב פנים</p>
          </div>
          <div style="text-align:center;font-size:12px;color:#999;padding:16px;">סטודיו מיכל וולברגר | עיצוב פנים<br/>הודעה זו נשלחה אוטומטית</div>
        </div>`;

        const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: { name: 'סטודיו מיכל וולברגר', email: 'michalwol123@gmail.com' },
            to: [{ email: client.email, name: clientName }],
            subject,
            htmlContent: htmlBody,
          }),
        });
        if (!brevoRes.ok) throw new Error(`Brevo error: ${JSON.stringify(await brevoRes.json())}`);

        await base44.asServiceRole.entities.Communication.create({
          client_id: clientId,
          type: 'email',
          direction: 'outbound',
          subject,
          content: `${target.label} "${title}" נשלח לחתימה במייל ל-${client.email}. קישור: ${signUrl}`,
          sent_by: 'system',
          status: 'sent',
          channel: 'gmail',
        });
        results.push('email sent');
      } else {
        results.push('email skipped — no email address');
      }
    }

    // === WhatsApp (pending Communication — sendWhatsApp picks it up) ===
    if (sendVia === 'whatsapp' || sendVia === 'both') {
      if (client.phone) {
        await base44.asServiceRole.entities.Communication.create({
          client_id: clientId,
          type: 'whatsapp',
          direction: 'outbound',
          content: `שלום ${clientName} 👋\n\n${target.label === 'הסכם' ? 'ההצעה וההסכם ממתינים' : 'הצעת המחיר ממתינה'} לחתימתך הדיגיטלית ✍️\n"${title}"\n\nלצפייה וחתימה:\n${signUrl}\n\nמיכל וולברגר - עיצוב פנים`,
          sent_by: 'system',
          status: 'pending',
          channel: 'base44_native',
        });
        results.push('whatsapp queued');
      } else {
        results.push('whatsapp skipped — no phone');
      }
    }

    // Internal note
    await base44.asServiceRole.entities.Communication.create({
      client_id: clientId,
      type: 'note',
      direction: 'outbound',
      content: `${target.label} "${title}" נשלח לחתימה (${sendVia}). קישור: ${signUrl}`,
      sent_by: 'system',
      status: 'sent',
      channel: 'base44_native',
    });

    return Response.json({ success: true, results, sign_url: signUrl });
  } catch (error) {
    try {
      const base44 = createClientFromRequest(req);
      const body = await req.json().catch(() => ({}));
      await base44.asServiceRole.entities.Communication.create({
        client_id: body?.data?.client_id || '',
        type: 'system_error',
        direction: 'outbound',
        content: `autoQuoteSignatureSent failed: ${error.message}`,
        sent_by: 'system',
        status: 'failed',
        channel: 'base44_native',
        error_detail: error.message,
      });
    } catch (_) { /* silent */ }
    return Response.json({ error: error.message }, { status: 500 });
  }
});