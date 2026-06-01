import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { file_id, file_name, project_id, stage, visible_to_client } = await req.json();

    if (!file_id || !project_id) {
      return Response.json({ error: 'Missing file_id or project_id' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googledrive");

    // Download the file content from Drive
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file_id}?alt=media`;
    const downloadRes = await fetch(downloadUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!downloadRes.ok) {
      const err = await downloadRes.text();
      return Response.json({ error: `Drive download error: ${downloadRes.status} - ${err}` }, { status: downloadRes.status });
    }

    const contentType = downloadRes.headers.get('content-type') || 'image/jpeg';
    const blob = await downloadRes.blob();

    // Determine file extension
    const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/heic': '.heic' };
    const ext = extMap[contentType] || '.jpg';
    const safeName = (file_name || `drive_photo_${file_id}`).replace(/\.[^/.]+$/, '') + ext;

    // Upload to Base44
    const file = new File([blob], safeName, { type: contentType });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    // Create Document record
    const doc = await base44.asServiceRole.entities.Document.create({
      project_id,
      name: file_name || safeName,
      file_url,
      type: 'photo',
      stage: stage || 13,
      visible_to_client: visible_to_client !== false,
      approval_status: 'approved',
    });

    return Response.json({ success: true, file_url, document_id: doc.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});