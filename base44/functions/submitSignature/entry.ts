// Public function — embeds signature into the original PDF using pdf-lib, then saves
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);
    const { token, signer_name, signature_image_url } = body;

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

    // --- Embed signature into the original PDF ---
    let signedPdfUrl = null;

    if (doc.file_url) {
      const pdfRes = await fetch(doc.file_url);
      const existingPdfBytes = await pdfRes.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];
      const { width } = lastPage.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Fetch signature image (HTTPS URL — works in Deno)
      const imgRes = await fetch(signature_image_url);
      const sigImageBytes = new Uint8Array(await imgRes.arrayBuffer());
      const sigImage = await pdfDoc.embedPng(sigImageBytes);

      const sigW = 160, sigH = 60;
      const sigX = width - sigW - 40;
      const sigY = 60;

      // Draw signature box
      lastPage.drawRectangle({
        x: sigX - 5, y: sigY - 18,
        width: sigW + 10, height: sigH + 28,
        color: rgb(0.97, 0.97, 0.97),
        borderColor: rgb(0.75, 0.75, 0.75),
        borderWidth: 0.5,
      });
      lastPage.drawImage(sigImage, { x: sigX, y: sigY, width: sigW, height: sigH });
      lastPage.drawLine({
        start: { x: sigX - 2, y: sigY - 2 },
        end: { x: sigX + sigW + 2, y: sigY - 2 },
        thickness: 0.7,
        color: rgb(0.4, 0.4, 0.4),
      });
      lastPage.drawText('Digital Signature', {
        x: sigX, y: sigY + sigH + 5,
        size: 7, font, color: rgb(0.65, 0.65, 0.65),
      });
      const dateStr = new Date().toLocaleDateString('en-GB');
      lastPage.drawText('Signed: ' + dateStr, {
        x: sigX, y: sigY - 18,
        size: 8, font, color: rgb(0.4, 0.4, 0.4),
      });

      const signedPdfBytes = await pdfDoc.save();
      const blob = new Blob([signedPdfBytes], { type: 'application/pdf' });
      const file = new File([blob], `signed_${(doc.name || 'document').replace(/\s/g, '_')}.pdf`, { type: 'application/pdf' });
      const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
      if (uploadResult?.file_url) signedPdfUrl = uploadResult.file_url;
    }

    // --- Update document ---
    await base44.asServiceRole.entities.Document.update(doc.id, {
      signature_status: 'signed',
      signed_at: signedAt,
      signer_name,
      signature_image_url,
      signed_pdf_url: signedPdfUrl,
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
              ${signedPdfUrl ? `<p style="margin-top:16px;"><a href="${signedPdfUrl}" style="background:#8B7355;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">צפה במסמך החתום ←</a></p>` : ''}
            </div>`
          })
        });
      }
    } catch (_) { /* notification failure should not block */ }

    return Response.json({ status: 'ok', signed_pdf_url: signedPdfUrl });
  } catch (err) {
    console.error('submitSignature error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});