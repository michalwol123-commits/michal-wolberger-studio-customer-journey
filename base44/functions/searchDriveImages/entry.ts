import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { query, folder_id } = await req.json();
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googledrive");

    // Build search query for images
    let q = "mimeType contains 'image/'";
    if (query && query.trim()) {
      q += ` and name contains '${query.trim().replace(/'/g, "\\'")}'`;
    }
    if (folder_id) {
      q += ` and '${folder_id}' in parents`;
    }
    q += " and trashed = false";

    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,thumbnailLink,modifiedTime)&orderBy=modifiedTime+desc&pageSize=30`;

    const response = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      const err = await response.text();
      return Response.json({ error: `Drive API error: ${response.status} - ${err}` }, { status: response.status });
    }

    const data = await response.json();
    return Response.json({ files: data.files || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});