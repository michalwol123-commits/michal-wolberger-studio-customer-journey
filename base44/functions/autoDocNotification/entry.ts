// PRD 7.4 — Document Notification to Client
// Trigger: Document created with visible_to_client=true
// Action: WhatsApp to client with portal link + Communication log
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, event } = await req.json();

    if (!data) return Response.json({ skipped: true });
    if (!data.visible_to_client) {
      return Response.json({ skipped: true, reason: 'not visible to client' });
    }

    const projectId = data.project_id;
    if (!projectId) return Response.json({ skipped: true, reason: 'no project_id' });

    // Get project
    const projects = await base44.asServiceRole.entities.Project.filter({ id: projectId });
    if (projects.length === 0) return Response.json({ skipped: true, reason: 'project not found' });
    const project = projects[0];

    // Get client
    const clients = await base44.asServiceRole.entities.Client.filter({ id: project.client_id });
    if (clients.length === 0) return Response.json({ skipped: true, reason: 'client not found' });
    const client = clients[0];

    // Build portal URL
    const appUrl = Deno.env.get('BASE44_APP_URL') || 'https://michal-design-flow.base44.app';
    const portalUrl = client.portal_token
      ? `${appUrl}/portal?token=${client.portal_token}`
      : 'הפורטל שלך';

    // WhatsApp to client
    await base44.asServiceRole.entities.Communication.create({
      client_id: client.id,
      project_id: projectId,
      type: 'whatsapp',
      direction: 'outbound',
      content: `📄 מסמך חדש נוסף לפרויקט שלך: "${data.name}". צפה בפורטל: ${portalUrl}`,
      sent_by: 'system',
      status: 'pending',
      channel: 'base44_native',
    });

    return Response.json({ success: true, automation: 'DocNotification', doc: data.name });
  } catch (error) {
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.Communication.create({
        client_id: '',
        type: 'system_error',
        direction: 'outbound',
        content: `Doc Notification failed: ${error.message}`,
        sent_by: 'system',
        status: 'failed',
        channel: 'base44_native',
        error_detail: error.message,
        retry_count: 0,
      });
    } catch (_) { /* silent */ }
    return Response.json({ error: error.message }, { status: 500 });
  }
});