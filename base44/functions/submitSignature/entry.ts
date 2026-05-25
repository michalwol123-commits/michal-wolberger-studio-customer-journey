import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    await base44.asServiceRole.entities.Document.update(doc.id, {
      signature_status: 'signed',
      signed_at: new Date().toISOString(),
      signer_name,
      signature_image_url,
    });

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