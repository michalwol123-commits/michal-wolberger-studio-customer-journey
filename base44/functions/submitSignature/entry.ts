// Public function — embeds digital signature into PDF and marks document as signed
// Called from: SignDocument.jsx public page
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, signer_name, signature_image_url } = await req.json();
    if (!token || !signer_name || !signature_image_url) {
      return Response.json({ error: 'missing_fields' }, { status: 400 });
    }

    // Find document by signature_token
    let docs = await base44.asServiceRole.entities.Document.filter({ signature_token: token });
    if (!docs || docs.length === 0) {
      const pending = await base44.asServiceRole.entities.Document.filter({ signature_status: 'pending_signature' });
      docs = pending.filter(d => d.signature_token === token);
    }
    const doc = docs[0];
    if (!doc) return Response.json({ error: 'not_found' }, { status: 404 });
    if (doc.signature_status === 'signed') return Response.json({ error: 'already_signed' }, { status: 410 });

    const signedAt = new Date().toISOString();
    const signedAtDisplay = new Date().toLocaleString('he-IL');
    let updatedFileUrl = doc.file_url;

    // --- Embed signature into PDF ---
    if (doc.file_url) {
      try {
        const pdfRes = await fetch(doc.file_url);
        const contentType = pdfRes.headers.get('content-type') || '';

        if (contentType.includes('pdf') || doc.file_url.toLowerCase().includes('.pdf')) {
          const existingPdfBytes = await pdfRes.arrayBuffer();
          const pdfDoc = await PDFDocument.load(existingPdfBytes);
          const pages = pdfDoc.getPages();
          const lastPage = pages[pages.length - 1];
          const { width, height } = lastPage.getSize();
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

          // Embed signature image (data: URL from canvas)
          let sigImageBytes;
          if (signature_image_url.startsWith('data:')) {
            const base64Data = signature_image_url.split(',')[1];
            const binary = atob(base64Data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            sigImageBytes = bytes.buffer;
          } else {
            sigImageBytes = await fetch(signature_image_url).then(r => r.arrayBuffer());
          }
          const sigImage = await pdfDoc.embedPng(sigImageBytes);

          // Draw signature box at bottom-right
          const sigW = 160;
          const sigH = 60;
          const sigX = width - sigW - 40;
          const sigY = 60;

          lastPage.drawRectangle({
            x: sigX - 5,
            y: sigY - 18,
            width: sigW + 10,
            height: sigH + 28,
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

          // Signer name + date
          lastPage.drawText(signer_name, {
            x: sigX + sigW - Math.min(signer_name.length * 5.2, sigW - 4),
            y: sigY - 14,
            size: 9,
            font,
            color: rgb(0.15, 0.15, 0.15),
          });
          lastPage.drawText(new Date().toLocaleDateString('he-IL'), {
            x: sigX,
            y: sigY - 14,
            size: 9,
            font,
            color: rgb(0.5, 0.5, 0.5),
          });
          lastPage.drawText('Digital Signature', {
            x: sigX,
            y: sigY + sigH + 5,
            size: 7,
            font,
            color: rgb(0.65, 0.65, 0.65),
          });

          const signedPdfBytes = await pdfDoc.save();
          const blob = new Blob([signedPdfBytes], { type: 'application/pdf' });
          const file = new File([blob], `signed_${doc.name || 'document'}.pdf`, { type: 'application/pdf' });
          const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
          if (uploadResult?.file_url) {
            updatedFileUrl = uploadResult.file_url;
          }
        }
      } catch (pdfErr) {
        console.error('PDF embedding failed:', pdfErr.message);
        // Continue — signature is still saved even if PDF embedding fails
      }
    }

    // --- Update document ---
    await base44.asServiceRole.entities.Document.update(doc.id, {
      signature_status: 'signed',
      signed_at: signedAt,
      signer_name,
      signature_image_url,
      file_url: updatedFileUrl,
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

    // --- Notify admin via Gmail (send to self) ---
    try {
      const { accessToken: gmailToken } = await base44.asServiceRole.connectors.getConnection('gmail');
      const adminSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(`✍️ מסמך נחתם: ${doc.name}`)))}?=`;
      const adminHtml = `<div dir="rtl" style="font-family:Arial,sans-serif;padding:20px;max-width:500px;">
        <h2 style="color:#8B7355;">מסמך נחתם ✍️</h2>
        <p>המסמך <strong>${doc.name}</strong> נחתם דיגיטלית.</p>
        <table style="margin-top:12px;font-size:14px;">
          <tr><td style="color:#888;padding:4px 12px 4px 0;">חותם:</td><td><strong>${signer_name}</strong></td></tr>
          <tr><td style="color:#888;padding:4px 12px 4px 0;">תאריך:</td><td>${signedAtDisplay}</td></tr>
        </table>
        <p style="margin-top:20px;">
          <a href="${updatedFileUrl}" style="background:#8B7355;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">
            צפה ב-PDF החתום
          </a>
        </p>
      </div>`;
      const adminEmailRaw = [
        `From: "מערכת CRM" <me>`,
        `To: me`,
        `Subject: ${adminSubject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=utf-8`,
        ``,
        adminHtml,
      ].join('\r\n');
      const adminRaw = btoa(unescape(encodeURIComponent(adminEmailRaw)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${gmailToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: adminRaw }),
      });
    } catch (notifyErr) { console.error('Admin Gmail notification failed:', notifyErr.message); }

    return Response.json({ status: 'ok', file_url: updatedFileUrl });
  } catch (err) {
    console.error('submitSignature error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});