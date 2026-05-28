// Temporary diagnostic function — same logic as submitSignature but with detailed logging
// Does NOT update any entities — only tests the PDF embedding and upload
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { pdf_url, signature_image_url } = body;
    if (!pdf_url || !signature_image_url) {
      return Response.json({ error: 'missing pdf_url or signature_image_url' }, { status: 400 });
    }

    const logs = [];
    const log = (msg) => { console.log(msg); logs.push(msg); };

    // 1. Fetch original PDF
    log('Step 1: Fetching original PDF...');
    const pdfRes = await fetch(pdf_url);
    log(`  HTTP status: ${pdfRes.status}`);
    log(`  Content-Type: ${pdfRes.headers.get('content-type')}`);
    const existingPdfBytes = await pdfRes.arrayBuffer();
    log(`  PDF size: ${existingPdfBytes.byteLength} bytes`);

    // 2. Load PDF
    log('Step 2: Loading PDF with pdf-lib...');
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    log(`  Pages count BEFORE addPage: ${pages.length}`);
    for (let i = 0; i < pages.length; i++) {
      const { width, height } = pages[i].getSize();
      log(`  Page ${i + 1}: ${width} x ${height}`);
    }

    // 3. Add signature page (same logic as submitSignature)
    log('Step 3: Adding signature page...');
    const lastOrigPage = pages[pages.length - 1];
    const { width: origW, height: origH } = lastOrigPage.getSize();
    const lastPage = pages.length >= 2
      ? pdfDoc.addPage([origW, origH])
      : pages[0];
    const { width, height } = lastPage.getSize();
    log(`  Target page size: ${width} x ${height}`);
    log(`  Total pages AFTER addPage: ${pdfDoc.getPages().length}`);

    // 4. Embed font
    log('Step 4: Embedding font...');
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // 5. Fetch signature image
    log('Step 5: Fetching signature image...');
    const imgRes = await fetch(signature_image_url);
    log(`  HTTP status: ${imgRes.status}`);
    log(`  Content-Type: ${imgRes.headers.get('content-type')}`);
    const sigImageBytes = new Uint8Array(await imgRes.arrayBuffer());
    log(`  Image size: ${sigImageBytes.byteLength} bytes`);
    log(`  First 4 bytes (PNG magic): ${sigImageBytes[0]}, ${sigImageBytes[1]}, ${sigImageBytes[2]}, ${sigImageBytes[3]}`);

    // 6. Embed image
    log('Step 6: Embedding PNG image...');
    const sigImage = await pdfDoc.embedPng(sigImageBytes);
    log(`  Embedded image dimensions: ${sigImage.width} x ${sigImage.height}`);

    // 7. Draw signature
    const sigW = 160, sigH = 60;
    const sigX = width - sigW - 40;
    const sigY = 60;
    log(`Step 7: Drawing signature at (${sigX}, ${sigY}), size ${sigW}x${sigH}`);

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
    log('  Drawing complete.');

    // 8. Save PDF
    log('Step 8: Saving PDF...');
    const signedPdfBytes = await pdfDoc.save();
    log(`  Signed PDF size: ${signedPdfBytes.byteLength} bytes`);
    log(`  Final page count: ${pdfDoc.getPages().length}`);

    // 9. Upload
    log('Step 9: Uploading signed PDF...');
    const blob = new Blob([signedPdfBytes], { type: 'application/pdf' });
    const file = new File([blob], 'test_signed.pdf', { type: 'application/pdf' });
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    log(`  Upload result: ${JSON.stringify(uploadResult)}`);

    // 10. Verify uploaded file
    if (uploadResult?.file_url) {
      log('Step 10: Verifying uploaded file...');
      const verifyRes = await fetch(uploadResult.file_url);
      const verifyBytes = await verifyRes.arrayBuffer();
      log(`  Uploaded file size: ${verifyBytes.byteLength} bytes`);
      log(`  Match original signed size: ${verifyBytes.byteLength === signedPdfBytes.byteLength}`);

      // Re-load and check page count
      const verifyDoc = await PDFDocument.load(verifyBytes);
      log(`  Uploaded PDF page count: ${verifyDoc.getPages().length}`);
    }

    return Response.json({
      status: 'diagnostic_complete',
      signed_pdf_url: uploadResult?.file_url || null,
      logs,
    });
  } catch (err) {
    console.error('testSignatureEmbed error:', err.message, err.stack);
    return Response.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
});