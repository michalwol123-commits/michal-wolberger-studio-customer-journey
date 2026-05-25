// Public function — returns document info for signature page
// Called from: /sign?token=XXX (no auth required)
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();
    if (!token) return Response.json({ error: 'missing_token' }, { status: 400 });

    // Find document by signature_token (service role — public page)
    const docs = await base44.asServiceRole.entities.Document.filter({ signature_token: token });
    const doc = docs[0];
    if (!doc) return Response.json({ error: 'not_found' }, { status: 404 });
    if (doc.signature_status === 'signed') return Response.json({ error: 'already_signed' }, { status: 410 });

    // Get client name for display
    let clientName = '';
    let projectName = '';
    if (doc.client_id) {
      const clients = await base44.asServiceRole.entities.Client.filter({ id: doc.client_id });
      clientName = clients[0]?.name || '';
    }
    if (doc.project_id) {
      const projects = await base44.asServiceRole.entities.Project.filter({ id: doc.project_id });
      projectName = projects[0]?.name || '';
    }

    return Response.json({
      doc_id: doc.id,
      name: doc.name,
      type: doc.type,
      file_url: doc.file_url,
      client_name: clientName,
      project_name: projectName,
    });
  } catch (err) {
    console.error('getSignatureData error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
