import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { file_id, action } = await req.json();
    if (!file_id) {
      return Response.json({ error: 'Missing file_id' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googledrive");

    // Export Google Doc as PDF
    const exportRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file_id}/export?mimeType=application/pdf`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    if (!exportRes.ok) {
      const errText = await exportRes.text();
      return Response.json({ error: `Export failed: ${exportRes.status} - ${errText}` }, { status: exportRes.status });
    }

    const pdfBlob = await exportRes.blob();
    const pdfFile = new File([pdfBlob], `drive_doc_${file_id}.pdf`, { type: 'application/pdf' });

    // Upload PDF to Base44
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfFile });

    return Response.json({ file_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});