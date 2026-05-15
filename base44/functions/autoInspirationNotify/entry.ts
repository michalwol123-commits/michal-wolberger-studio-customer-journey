import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only staff-published items
    if (data?.uploader_role !== 'staff' || data?.is_approved !== true) {
      return Response.json({ skipped: true });
    }

    if (!data.project_id) {
      return Response.json({ skipped: true, reason: 'no project_id' });
    }

    // Get project and client
    const projects = await base44.asServiceRole.entities.Project.filter({ id: data.project_id });
    const project = projects[0];
    if (!project?.client_id) return Response.json({ skipped: true, reason: 'no client' });

    const clients = await base44.asServiceRole.entities.Client.filter({ id: project.client_id });
    const client = clients[0];
    if (!client) return Response.json({ skipped: true, reason: 'client not found' });

    // Log communication
    await base44.asServiceRole.entities.Communication.create({
      client_id: client.id,
      project_id: data.project_id,
      type: 'whatsapp',
      direction: 'outbound',
      content: `שלום ${client.name || ''} 👋 מיכל שיתפה איתך חומרי השראה חדשים! כנסי לפורטל לצפייה ולתגובה 🎨`,
      sent_by: 'system',
      channel: 'base44_native',
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('autoInspirationNotify error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});