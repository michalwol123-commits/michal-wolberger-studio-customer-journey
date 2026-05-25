// DEBUG ONLY — test PDF embedding steps to find where it fails
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

    const { doc_id } = body;
    if (!doc_id) return Response.json({ error: 'missing doc_id' }, { status: 400 });

    const docs = await base44.asServiceRole.entities.Document.filter({ id: doc_id });
    const doc = docs[0];
    if (!doc) return Response.json({ error: 'doc not found' }, { status: 404 });

    const steps = [];

    // Step 1: Fetch PDF
    steps.push({ step: 1, action: 'fetching PDF', url: doc.file_url });
    const pdfRes = await fetch(doc.file_url);
    const contentType = pdfRes.headers.get('content-type') || '';
    const status = pdfRes.status;
    steps.push({ step: 1, result: 'fetched', status, contentType, ok: pdfRes.ok });

    if (!pdfRes.ok) {
      return Response.json({ error: 'PDF fetch failed', steps });
    }

    // Step 2: Load PDF
    const pdfBytes = await pdfRes.arrayBuffer();
    steps.push({ step: 2, action: 'loading PDF', byteLength: pdfBytes.byteLength });
    
    let pdfDoc;
    try {
      pdfDoc = await PDFDocument.load(pdfBytes);
      steps.push({ step: 2, result: 'PDF loaded', pageCount: pdfDoc.getPageCount() });
    } catch (loadErr) {
      steps.push({ step: 2, result: 'PDF load FAILED', error: loadErr.message });
      return Response.json({ error: 'PDF load failed', steps });
    }

    // Step 3: Create test signature PNG (1x1 pixel)
    const testPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const binary = atob(testPngBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    let sigImage;
    try {
      sigImage = await pdfDoc.embedPng(bytes.buffer);
      steps.push({ step: 3, result: 'PNG embedded successfully', width: sigImage.width, height: sigImage.height });
    } catch (pngErr) {
      steps.push({ step: 3, result: 'embedPng FAILED', error: pngErr.message });
      return Response.json({ error: 'embedPng failed', steps });
    }

    // Step 4: Draw on page
    try {
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];
      const { width, height } = lastPage.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      lastPage.drawImage(sigImage, { x: width - 200, y: 60, width: 160, height: 60 });
      lastPage.drawText('DEBUG TEST', { x: width - 200, y: 50, size: 9, font, color: rgb(0.15, 0.15, 0.15) });
      steps.push({ step: 4, result: 'drew on page', pageSize: { width, height } });
    } catch (drawErr) {
      steps.push({ step: 4, result: 'draw FAILED', error: drawErr.message });
      return Response.json({ error: 'draw failed', steps });
    }

    // Step 5: Save PDF
    let signedPdfBytes;
    try {
      signedPdfBytes = await pdfDoc.save();
      steps.push({ step: 5, result: 'PDF saved', byteLength: signedPdfBytes.byteLength });
    } catch (saveErr) {
      steps.push({ step: 5, result: 'save FAILED', error: saveErr.message });
      return Response.json({ error: 'save failed', steps });
    }

    // Step 6: Upload
    try {
      const blob = new Blob([signedPdfBytes], { type: 'application/pdf' });
      const file = new File([blob], `debug_signed_${doc.name || 'test'}.pdf`, { type: 'application/pdf' });
      const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
      steps.push({ step: 6, result: 'uploaded', file_url: uploadResult?.file_url });
    } catch (uploadErr) {
      steps.push({ step: 6, result: 'upload FAILED', error: uploadErr.message });
      return Response.json({ error: 'upload failed', steps });
    }

    return Response.json({ success: true, steps });
  } catch (err) {
    console.error('debugSignature error:', err.message);
    return Response.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
});