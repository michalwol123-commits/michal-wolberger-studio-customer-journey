// Public function — creates a separate signature certificate PDF and marks document as signed
// Does NOT modify the original document PDF (avoids memory issues with large files)
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

    // Find document by signature_token
    const docs = await base44.asServiceRole.entities.Document.filter({ signature_token: token });
    const doc = docs[0];
    if (!doc) return Response.json({ error: 'not_found' }, { status: 404 });
    if (doc.signature_status === 'signed') return Response.json({ error: 'already_signed' }, { status: 410 });

    const signedAt = new Date().toISOString();
    const signedDate = new Date().toLocaleDateString('he-IL');
    const signedTime = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

    // --- Create signature certificate PDF (small, single page) ---
    let signedPdfUrl = null;
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const brown = rgb(0.545, 0.451, 0.333); // #8B7355
      const darkGray = rgb(0.15, 0.15, 0.15);
      const gray = rgb(0.5, 0.5, 0.5);
      const lightBg = rgb(0.98, 0.97, 0.96);

      // Header bar
      page.drawRectangle({ x: 0, y: 742, width: 595, height: 100, color: brown });
      page.drawText('Digital Signature Certificate', {
        x: 40, y: 800, size: 22, font: fontBold, color: rgb(1, 1, 1),
      });
      page.drawText('Michal Wolberger Interior Design', {
        x: 40, y: 775, size: 11, font, color: rgb(1, 1, 1, 0.8),
      });
      page.drawText('Certificate ID: ' + token.slice(0, 12).toUpperCase(), {
        x: 40, y: 755, size: 9, font, color: rgb(1, 1, 1, 0.6),
      });

      // Document info section
      let y = 710;
      page.drawText('Document Details', { x: 40, y, size: 14, font: fontBold, color: darkGray });
      y -= 28;

      const drawField = (label, value, yPos) => {
        page.drawText(label, { x: 40, y: yPos, size: 10, font, color: gray });
        page.drawText(value || '-', { x: 170, y: yPos, size: 11, font: fontBold, color: darkGray });
        return yPos - 22;
      };

      y = drawField('Document Name:', doc.name || 'N/A', y);
      y = drawField('Document Type:', doc.type || 'N/A', y);
      y = drawField('Signed By:', signer_name, y);
      y = drawField('Date:', signedDate, y);
      y = drawField('Time:', signedTime, y);

      // Separator
      y -= 10;
      page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
      y -= 30;

      // Signature section
      page.drawText('Signature', { x: 40, y, size: 14, font: fontBold, color: darkGray });
      y -= 15;

      // Embed signature image
      let sigImageBytes;
      if (signature_image_url.startsWith('data:')) {
        const base64Data = signature_image_url.replace(/^data:image\/\w+;base64,/, '');
        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        sigImageBytes = bytes.buffer;
      } else {
        sigImageBytes = await fetch(signature_image_url).then(r => r.arrayBuffer());
      }

      const sigImage = await pdfDoc.embedPng(sigImageBytes);

      // Signature box
      const sigBoxX = 40;
      const sigBoxY = y - 100;
      const sigBoxW = 300;
      const sigBoxH = 100;

      page.drawRectangle({
        x: sigBoxX, y: sigBoxY, width: sigBoxW, height: sigBoxH,
        color: lightBg, borderColor: rgb(0.75, 0.75, 0.75), borderWidth: 0.5,
      });

      // Scale signature to fit box with padding
      const scale = Math.min((sigBoxW - 20) / sigImage.width, (sigBoxH - 20) / sigImage.height);
      const sigW = sigImage.width * scale;
      const sigH = sigImage.height * scale;
      page.drawImage(sigImage, {
        x: sigBoxX + (sigBoxW - sigW) / 2,
        y: sigBoxY + (sigBoxH - sigH) / 2,
        width: sigW,
        height: sigH,
      });

      // Line under signature
      page.drawLine({
        start: { x: sigBoxX + 10, y: sigBoxY + 12 },
        end: { x: sigBoxX + sigBoxW - 10, y: sigBoxY + 12 },
        thickness: 0.7, color: gray,
      });

      // Signer name under box
      y = sigBoxY - 18;
      page.drawText(signer_name, { x: sigBoxX, y, size: 11, font: fontBold, color: darkGray });

      // Legal text at bottom
      y = 120;
      page.drawLine({ start: { x: 40, y: y + 10 }, end: { x: 555, y: y + 10 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
      page.drawText('This certificate confirms that the above-named person has digitally signed the referenced document.', {
        x: 40, y: y - 10, size: 9, font, color: gray,
      });
      page.drawText('The signature was captured electronically and is legally binding as per the signer\'s consent.', {
        x: 40, y: y - 24, size: 9, font, color: gray,
      });
      page.drawText('Generated by Michal Wolberger Interior Design Management System', {
        x: 40, y: y - 48, size: 8, font, color: rgb(0.7, 0.7, 0.7),
      });

      // Save and upload
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const file = new File([blob], `signature_certificate_${doc.name || 'doc'}.pdf`, { type: 'application/pdf' });
      const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
      if (uploadResult?.file_url) {
        signedPdfUrl = uploadResult.file_url;
      }
    } catch (certErr) {
      console.error('Certificate PDF creation failed:', certErr.message);
      // Continue — signature is still saved even if certificate creation fails
    }

    // --- Update document (file_url stays unchanged!) ---
    const updateData = {
      signature_status: 'signed',
      signed_at: signedAt,
      signer_name,
      signature_image_url,
    };
    if (signedPdfUrl) {
      updateData.signed_pdf_url = signedPdfUrl;
    }
    await base44.asServiceRole.entities.Document.update(doc.id, updateData);

    // --- Log communication ---
    if (doc.client_id) {
      await base44.asServiceRole.entities.Communication.create({
        client_id: doc.client_id,
        project_id: doc.project_id || undefined,
        type: 'note',
        direction: 'inbound',
        content: `✍️ המסמך "${doc.name}" נחתם דיגיטלית על ידי ${signer_name} ב-${signedDate} ${signedTime}`,
        sent_by: 'system',
        status: 'sent',
        channel: 'base44_native',
      });
    }

    // --- Notify admin via Brevo ---
    try {
      const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
      const certLink = signedPdfUrl
        ? `<p style="margin-top:12px;"><a href="${signedPdfUrl}" style="background:#8B7355;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">צפה באישור החתימה (PDF)</a></p>`
        : '';
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: { name: 'סטודיו מיכל וולברגר', email: 'michalwol123@gmail.com' },
          to: [{ email: 'michalwol123@gmail.com' }],
          subject: `✍️ מסמך נחתם: ${doc.name}`,
          htmlContent: `<div dir="rtl" style="font-family:Arial,sans-serif;padding:20px;max-width:500px;">
            <h2 style="color:#8B7355;">מסמך נחתם ✍️</h2>
            <p>המסמך <strong>${doc.name}</strong> נחתם דיגיטלית.</p>
            <table style="margin-top:12px;font-size:14px;">
              <tr><td style="color:#888;padding:4px 12px 4px 0;">חותם:</td><td><strong>${signer_name}</strong></td></tr>
              <tr><td style="color:#888;padding:4px 12px 4px 0;">תאריך:</td><td>${signedDate} ${signedTime}</td></tr>
            </table>
            ${certLink}
          </div>`
        })
      });
    } catch (_) { /* notification failure should not block */ }

    return Response.json({ status: 'ok', signed_pdf_url: signedPdfUrl });
  } catch (err) {
    console.error('submitSignature error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});