// Automation: Send quote to client when status changes to "sent"
// Trigger: Quote entity — update event, status changed to "sent"
// Creates Communication records (email / whatsapp / both) based on quote.send_via
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, old_data, event } = await req.json();

    if (!data || !old_data || !event) return Response.json({ skipped: true });

    // Only fire when status changed TO sent
    if (data.status !== 'sent' || old_data.status === 'sent') {
      return Response.json({ skipped: true, reason: 'not a transition to sent' });
    }



    const quoteId = event.entity_id;
    const clientId = data.client_id;
    if (!clientId) return Response.json({ skipped: true, reason: 'no client_id' });

    // Fetch client
    const clients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
    if (clients.length === 0) return Response.json({ error: 'Client not found' }, { status: 404 });
    const client = clients[0];

    const quoteType = data.quote_type || 'link';
    const sendVia = data.send_via || 'email';
    const clientName = client.name || 'לקוח/ה';
    const title = data.title || 'הצעת מחיר';
    const amount = data.total_amount ? `₪${Number(data.total_amount).toLocaleString()}` : '';

    // Update sent_at timestamp
    await base44.asServiceRole.entities.Quote.update(quoteId, {
      sent_at: new Date().toISOString(),
    });

    // Auto-generate PDF if missing and quote_type is 'generated'
    let pdfUrl = data.file_url;
    if (!pdfUrl && quoteType === 'generated') {
      console.log('No file_url found, generating PDF on-demand...');
      const pdfResult = await base44.asServiceRole.functions.invoke('generateQuotePDF', {
        client_id: clientId,
        quote_id: quoteId,
        title: title,
        package_type: data.package_type,
        total_amount: data.total_amount,
        scope: data.scope,
        meeting_date: data.meeting_date,
      });
      pdfUrl = pdfResult?.data?.file_url;
      console.log('PDF generated:', pdfUrl);
    }

    // For link type, use url field as fallback
    const linkUrl = pdfUrl || data.url || '';

    // Build WhatsApp content
    const whatsappContent = `שלום ${clientName} 👋\n\nהצעת המחיר שלך מוכנה!\n"${title}"${amount ? ` | ${amount}` : ''}\n\n${linkUrl ? `לצפייה: ${linkUrl}` : ''}\n\nמיכל וולברגר - עיצוב פנים`;

    const results = [];

    // Send email directly via Gmail API (with PDF attachment if available)
    if (sendVia === 'email' || sendVia === 'both') {
      if (client.email) {
        const { accessToken: gmailToken } = await base44.asServiceRole.connectors.getConnection('gmail');
        const subject = `הצעת מחיר — ${title}`;
        const subjectEncoded = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;

        const htmlBody = `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#8B7355;padding:32px;text-align:center;color:white;">
            <h1 style="margin:0;font-size:22px;">סטודיו מיכל וולברגר</h1>
            <p style="margin:8px 0 0;font-size:13px;opacity:0.85;">עיצוב פנים</p>
          </div>
          <div style="padding:32px;">
            <p>שלום ${clientName},</p>
            <p>מצורפת הצעת המחיר שלך: <strong>"${title}"</strong>${amount ? ` בסך ${amount}` : ''}.</p>
            ${linkUrl ? `<p><a href="${linkUrl}" style="color:#8B7355;">לצפייה בהצעה</a></p>` : ''}
            <p>בברכה,<br/>מיכל וולברגר - עיצוב פנים</p>
          </div>
          <div style="text-align:center;font-size:12px;color:#999;padding:16px;">סטודיו מיכל וולברגר | עיצוב פנים<br/>הודעה זו נשלחה אוטומטית</div>
        </div>`;

        let rawEmail;

        if (pdfUrl) {
          // Send with PDF attachment
          const pdfRes = await fetch(pdfUrl);
          const pdfBuffer = await pdfRes.arrayBuffer();
          const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
          const boundary = 'boundary_' + Date.now();
          const mimeEmail = [
            `From: "סטודיו מיכל וולברגר" <me>`,
            `To: ${client.email}`,
            `Subject: ${subjectEncoded}`,
            `MIME-Version: 1.0`,
            `Content-Type: multipart/mixed; boundary="${boundary}"`,
            ``,
            `--${boundary}`,
            `Content-Type: text/html; charset=utf-8`,
            ``,
            htmlBody,
            ``,
            `--${boundary}`,
            `Content-Type: application/pdf`,
            `Content-Transfer-Encoding: base64`,
            `Content-Disposition: attachment; filename="quote_${clientName}.pdf"`,
            ``,
            pdfBase64,
            `--${boundary}--`,
          ].join('\r\n');
          rawEmail = btoa(unescape(encodeURIComponent(mimeEmail))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        } else {
          // Send without attachment
          const emailRaw = [
            `From: "סטודיו מיכל וולברגר" <me>`,
            `To: ${client.email}`,
            `Subject: ${subjectEncoded}`,
            `MIME-Version: 1.0`,
            `Content-Type: text/html; charset=utf-8`,
            ``,
            htmlBody,
          ].join('\r\n');
          rawEmail = btoa(unescape(encodeURIComponent(emailRaw))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        }

        const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${gmailToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ raw: rawEmail }),
        });
        if (!gmailRes.ok) throw new Error(`Gmail error: ${JSON.stringify(await gmailRes.json())}`);

        // Log email communication as sent
        await base44.asServiceRole.entities.Communication.create({
          client_id: clientId,
          type: 'email',
          direction: 'outbound',
          subject: subject,
          content: `הצעת מחיר "${title}" נשלחה עם PDF מצורף ל-${client.email}`,
          sent_by: 'system',
          status: 'sent',
          channel: 'gmail',
          attachment_url: pdfUrl || undefined,
        });
        results.push('email sent directly via Gmail');
      } else {
        results.push('email skipped — no email address');
      }
    }

    // Create WhatsApp Communication record (picked up by sendWhatsApp automation)
    if (sendVia === 'whatsapp' || sendVia === 'both') {
      if (client.phone) {
        await base44.asServiceRole.entities.Communication.create({
          client_id: clientId,
          type: 'whatsapp',
          direction: 'outbound',
          content: whatsappContent,
          sent_by: 'system',
          status: 'pending',
          channel: 'base44_native',
          attachment_url: attachmentUrl || undefined,
        });
        results.push('whatsapp queued');
      } else {
        results.push('whatsapp skipped — no phone');
      }
    }

    // Create Document record for the quote file (skip if already exists)
    if (pdfUrl || data.url) {
      const fileUrl = pdfUrl || data.url;
      const existingDocs = await base44.asServiceRole.entities.Document.filter({ client_id: clientId });
      const alreadyExists = existingDocs.some(d => d.type === 'quote' && d.file_url === fileUrl);
      if (!alreadyExists) {
        await base44.asServiceRole.entities.Document.create({
          client_id: clientId,
          name: `הצעת מחיר — ${title}`,
          file_url: fileUrl,
          type: 'quote',
          approval_status: 'pending',
          visible_to_client: false,
        });
      }
    }

    // Update client status to proposal_sent
    const clientsList = await base44.asServiceRole.entities.Client.filter({ id: clientId });
    if (clientsList.length > 0) {
      const currentStatus = clientsList[0].status;
      if (['qualified', 'proposal_presented'].includes(currentStatus)) {
        await base44.asServiceRole.entities.Client.update(clientId, {
          status: 'proposal_sent',
        });
      }
    }

    // Log internal note
    await base44.asServiceRole.entities.Communication.create({
      client_id: clientId,
      type: 'note',
      direction: 'outbound',
      content: `הצעת מחיר "${title}" נשלחה ל-${clientName} (${sendVia}). סוג: ${quoteType}`,
      sent_by: 'system',
      status: 'sent',
      channel: 'base44_native',
    });

    return Response.json({ success: true, results });
  } catch (error) {
    try {
      const base44 = createClientFromRequest(req);
      const body = await req.json().catch(() => ({}));
      await base44.asServiceRole.entities.Communication.create({
        client_id: body?.data?.client_id || '',
        type: 'system_error',
        direction: 'outbound',
        content: `autoQuoteSent failed: ${error.message}`,
        sent_by: 'system',
        status: 'failed',
        channel: 'base44_native',
        error_detail: error.message,
      });
    } catch (_) { /* silent */ }
    return Response.json({ error: error.message }, { status: 500 });
  }
});