import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { query } = await req.json();
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googledrive");

    const searchQuery = encodeURIComponent(query || "סיכום פגישה");
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name+contains+'${searchQuery}'+and+mimeType='application/vnd.google-apps.document'&fields=files(id,name,modifiedTime)&orderBy=modifiedTime+desc&pageSize=10`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

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