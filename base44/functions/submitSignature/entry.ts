import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, signer_name, signature_image_url } = await req.json();
    if (!token || !signer_name || !signature_image_url) {
      return Response.json({ error: 'missing_fields' }, { status: 400 });
    }

    const docs = await base44.asServiceRole.entities.Document.filter({ signature_token: token });
    const doc = docs[0];
    if (!doc) return Response.json({ error: 'not_found' }, { status: 404 });
    if (doc.signature_status === 'signed') return Response.json({ error: 'already_signed' }, { status: 410 });

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const signedAt = new Date().toISOString();

    let updatedFileUrl = doc.file_url;

    // Try to embed signature into PDF
    if (doc.file_url) {
      try {
        const pdfRes = await fetch(doc.file_url);
        const contentType = pdfRes.headers.get('content-type') || '';
        
        if (contentType.includes('pdf') || doc.file_url.toLowerCase().includes('.pdf')) {
          const existingPdfBytes = await pdfRes.arrayBuffer();
          const pdfDoc = await PDFDocument.load(existingPdfBytes);
          const pages = pdfDoc.getPages();
          const lastPage = pages[pages.length - 1];
          const { width } = lastPage.getSize();
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

          // Embed signature image (PNG from canvas)
          const sigImageBytes = await fetch(signature_image_url).then(r => r.arrayBuffer());
          const sigImage = await pdfDoc.embedPng(sigImageBytes);
          lastPage.drawImage(sigImage, { x: width - 220, y: 60, width: 150, height: 60 });

          // Add text
          const signedText = `Signed by: ${signer_name}  |  ${new Date().toLocaleString('he-IL')}`;
          lastPage.drawText(signedText, { x: 40, y: 40, size: 9, font, color: rgb(0.4, 0.4, 0.4) });

          const signedPdfBytes = await pdfDoc.save();
          
          // Write to /tmp and upload
          const tmpPath = `/tmp/signed_${Date.now()}.pdf`;
          await Deno.writeFile(tmpPath, new Uint8Array(signedPdfBytes));
          const fileData = await Deno.readFile(tmpPath);
          const blob = new Blob([fileData], { type: 'application/pdf' });
          const file = new File([blob], `signed_${doc.name || 'document'}.pdf`, { type: 'application/pdf' });
          
          const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
          if (uploadResult?.file_url) {
            updatedFileUrl = uploadResult.file_url;
          }
        }
      } catch (pdfErr) {
        // PDF embedding failed — continue with fallback (save signature separately)
        console.error('PDF embedding failed:', pdfErr.message);
      }
    }

    // Update document
    await base44.asServiceRole.entities.Document.update(doc.id, {
      signature_status: 'signed',
      signed_at: signedAt,
      signer_name,
      signature_image_url,
      file_url: updatedFileUrl,
    });

    // Log communication
    if (doc.client_id) {
      await base44.asServiceRole.entities.Communication.create({
        client_id: doc.client_id,
        project_id: doc.project_id || undefined,
        type: 'note',
        direction: 'inbound',
        content: `המסמך "${doc.name}" נחתם דיגיטלית על ידי ${signer_name} ב-${new Date().toLocaleString('he-IL')} (IP: ${ip})`,
        sent_by: 'system',
        status: 'sent',
        channel: 'base44_native',
      });
    }

    return Response.json({ status: 'ok' });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});