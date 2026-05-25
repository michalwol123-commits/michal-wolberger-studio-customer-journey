// Public function — returns document info for signature page
// Called from: /sign?token=XXX (no auth required)
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'Missing token' }, { status: 400 });
    }

    // Find document by sign_token (service role — public page)
    const docs = await base44.asServiceRole.entities.Document.filter({ sign_token: token });
    if (docs.length === 0) {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }
    const doc = docs[0];

    // Already signed?
    if (doc.signed_at) {
      return Response.json({
        already_signed: true,
        signed_at: doc.signed_at,
        signed_by_name: doc.signed_by_name,
        doc_name: doc.name,
        signed_pdf_url: doc.signed_pdf_url || doc.file_url,
      });
    }

    // Get project + client name for display
    let project_name = '';
    let client_name = '';

    if (doc.project_id) {
      const projects = await base44.asServiceRole.entities.Project.filter({ id: doc.project_id });
      if (projects[0]) {
        project_name = projects[0].name || '';
        const clients = await base44.asServiceRole.entities.Client.filter({ id: projects[0].client_id });
        client_name = clients[0]?.name || '';
      }
    } else if (doc.client_id) {
      const clients = await base44.asServiceRole.entities.Client.filter({ id: doc.client_id });
      client_name = clients[0]?.name || '';
    }

    return Response.json({
      doc_id: doc.id,
      doc_name: doc.name,
      doc_type: doc.type,
      file_url: doc.file_url,
      project_name,
      client_name,
    });
  } catch (error) {
    console.error('getSignatureData error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
