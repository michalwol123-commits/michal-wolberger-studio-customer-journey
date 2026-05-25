// Public function — embeds digital signature into PDF and marks document as signed
// Called from: SignDocument.jsx public page
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, signer_name, signature_image } = await req.json();
    // signature_image = data:image/png;base64,... (from canvas.toDataURL())

    if (!token || !signer_name || !signature_image) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find document by token
    const docs = await base44.asServiceRole.entities.Document.filter({ sign_token: token });
    if (docs.length === 0) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }
    const doc = docs[0];

    if (doc.signed_at) {
      return Response.json({ error: 'already_signed' }, { status: 409 });
    }

    if (!doc.file_url) {
      return Response.json({ error: 'Document has no file' }, { status: 400 });
    }

    // --- Download original PDF ---
    const pdfRes = await fetch(doc.file_url);
    if (!pdfRes.ok) throw new Error('Failed to download PDF: ' + doc.file_url);
    const pdfBytes = await pdfRes.arrayBuffer();

    // --- Load PDF with pdf-lib ---
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();

    // --- Embed signature image ---
    const signatureBase64 = signature_image.replace(/^data:image\/png;base64,/, '');
    const signatureBytes = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));
    const sigImage = await pdfDoc.embedPng(signatureBytes);

    // Position: bottom-right area of last page
    const sigW = 160;
    const sigH = 55;
    const sigX = width - sigW - 40;
    const sigY = 60;

    // Draw signature box background (light gray)
    lastPage.drawRectangle({
      x: sigX - 5,
      y: sigY - 20,
      width: sigW + 10,
      height: sigH + 30,
      color: rgb(0.97, 0.97, 0.97),
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 0.5,
    });

    // Draw signature image
    lastPage.drawImage(sigImage, {
      x: sigX,
      y: sigY,
      width: sigW,
      height: sigH,
    });

    // Draw line under signature
    lastPage.drawLine({
      start: { x: sigX - 2, y: sigY - 2 },
      end: { x: sigX + sigW + 2, y: sigY - 2 },
      thickness: 0.8,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Add signer name and date text
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const signedDate = new Date().toLocaleDateString('he-IL');
    lastPage.drawText(signer_name, {
      x: sigX + sigW - (signer_name.length * 5.5),
      y: sigY - 14,
      size: 9,
      font,
      color: rgb(0.15, 0.15, 0.15),
    });
    lastPage.drawText(signedDate, {
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
      color: rgb(0.6, 0.6, 0.6),
    });

    // --- Save signed PDF ---
    const signedPdfBytes = await pdfDoc.save();
    const signedBlob = new Blob([signedPdfBytes], { type: 'application/pdf' });
    const signedFile = new File(
      [signedBlob],
      `signed_${doc.name?.replace(/[^a-zA-Z0-9א-ת]/g, '_')}_${Date.now()}.pdf`,
      { type: 'application/pdf' }
    );

    // --- Upload signed PDF to Base44 ---
    const { file_url: signed_pdf_url } = await base44.asServiceRole.integrations.Core.UploadFile({
      file: signedFile,
    });

    // --- Update document ---
    const signedAt = new Date().toISOString();
    await base44.asServiceRole.entities.Document.update(doc.id, {
      signed_at: signedAt,
      signed_by_name: signer_name,
      signed_pdf_url,
      approval_status: 'approved',
    });

    // --- Log communication ---
    const signedAtDisplay = new Date().toLocaleString('he-IL');
    await base44.asServiceRole.entities.Communication.create({
      client_id: doc.client_id || '',
      project_id: doc.project_id || '',
      type: 'note',
      direction: 'inbound',
      content: `✍️ המסמך "${doc.name}" נחתם דיגיטלית על ידי ${signer_name} ב-${signedAtDisplay}`,
      sent_by: 'system',
      status: 'sent',
      channel: 'base44_native',
    });

    // --- Notify admin via Gmail directly ---
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
          <a href="${signed_pdf_url}" style="background:#8B7355;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">
            צפה ב-PDF החתום
          </a>
        </p>
      </div>`;
      // Send to self (Gmail account = Michal's account)
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
    } catch (_) { /* notification failure should not break the main flow */ }

    return Response.json({
      success: true,
      signed_pdf_url,
      signed_at: signedAt,
    });
  } catch (error) {
    console.error('submitSignature error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
