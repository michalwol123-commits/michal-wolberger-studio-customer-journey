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

    // Build message content
    let emailContent = '';
    let whatsappContent = '';
    let attachmentUrl = '';

    if (quoteType === 'link') {
      // Send link
      const link = data.file_url || data.url || '';
      emailContent = `שלום ${clientName},\n\nמצורפת הצעת המחיר שלך: "${title}"${amount ? ` בסך ${amount}` : ''}.\n\nלצפייה בהצעה: ${link}\n\nבברכה,\nמיכל וולברגר - עיצוב פנים`;
      whatsappContent = `שלום ${clientName} 👋\n\nהצעת המחיר שלך מוכנה!\n"${title}"${amount ? ` | ${amount}` : ''}\n\nלצפייה: ${link}\n\nמיכל וולברגר - עיצוב פנים`;
    } else {
      // generated or uploaded — use file_url
      attachmentUrl = data.file_url || '';
      emailContent = `שלום ${clientName},\n\nמצורפת הצעת המחיר שלך: "${title}"${amount ? ` בסך ${amount}` : ''}.\n\nלצפייה בהצעה: ${attachmentUrl}\n\nבברכה,\nמיכל וולברגר - עיצוב פנים`;
      whatsappContent = `שלום ${clientName} 👋\n\nהצעת המחיר שלך מוכנה!\n"${title}"${amount ? ` | ${amount}` : ''}\n\nלהורדה: ${attachmentUrl}\n\nמיכל וולברגר - עיצוב פנים`;
    }

    const results = [];

    // Create email Communication record (picked up by sendEmail automation)
    if (sendVia === 'email' || sendVia === 'both') {
      if (client.email) {
        await base44.asServiceRole.entities.Communication.create({
          client_id: clientId,
          type: 'email',
          direction: 'outbound',
          subject: `הצעת מחיר — ${title}`,
          content: emailContent,
          sent_by: 'system',
          status: 'pending',
          channel: 'base44_native',
          attachment_url: attachmentUrl || undefined,
        });
        results.push('email queued');
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
    if (data.file_url || data.url) {
      const fileUrl = data.file_url || data.url;
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