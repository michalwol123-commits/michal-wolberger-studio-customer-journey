// Public function — marks document as signed, saves certificate PDF URL from frontend
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);
    const { token, signer_name, signature_image_url, signed_pdf_url } = body;

    if (!token || !signer_name || !signature_image_url) {
      return Response.json({ error: 'missing_fields' }, { status: 400 });
    }

    // Find document by token
    let docs = await base44.asServiceRole.entities.Document.filter({ signature_token: token });
    if (!docs?.length) {
      const pending = await base44.asServiceRole.entities.Document.filter({ signature_status: 'pending_signature' });
      docs = pending.filter(d => d.signature_token === token);
    }
    if (!docs?.length) return Response.json({ error: 'not_found' }, { status: 404 });
    const doc = docs[0];
    if (doc.signature_status === 'signed') return Response.json({ error: 'already_signed' }, { status: 410 });

    const signedAt = new Date().toISOString();
    const signedAtDisplay = new Date().toLocaleString('he-IL');

    // --- Update document (never overwrite file_url) ---
    await base44.asServiceRole.entities.Document.update(doc.id, {
      signature_status: 'signed',
      signed_at: signedAt,
      signer_name,
      signature_image_url,
      signed_pdf_url: signed_pdf_url || null,
    });

    // --- Log communication ---
    if (doc.client_id) {
      await base44.asServiceRole.entities.Communication.create({
        client_id: doc.client_id,
        project_id: doc.project_id || undefined,
        type: 'note',
        direction: 'inbound',
        content: `✍️ המסמך "${doc.name}" נחתם דיגיטלית על ידי ${signer_name} ב-${signedAtDisplay}`,
        sent_by: 'system',
        status: 'sent',
        channel: 'base44_native',
      });
    }

    // --- Notify admin via Brevo ---
    try {
      const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
      if (BREVO_API_KEY) {
        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: { name: 'סטודיו מיכל וולברגר', email: 'michalwol123@gmail.com' },
            to: [{ email: 'michalwol123@gmail.com' }],
            subject: `✍️ מסמך נחתם: ${doc.name}`,
            htmlContent: `<div dir="rtl" style="font-family:Arial,sans-serif;padding:20px;">
              <h2 style="color:#8B7355;">מסמך נחתם ✍️</h2>
              <p><strong>${doc.name}</strong> נחתם על ידי <strong>${signer_name}</strong> ב-${signedAtDisplay}</p>
              ${signed_pdf_url ? `<p style="margin-top:16px;"><a href="${signed_pdf_url}" style="background:#8B7355;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">צפה באישור החתימה ←</a></p>` : ''}
            </div>`
          })
        });
      }
    } catch (_) { /* notification failure should not block */ }

    return Response.json({ status: 'ok', signed_pdf_url: signed_pdf_url || null });
  } catch (err) {
    console.error('submitSignature error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});