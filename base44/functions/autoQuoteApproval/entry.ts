// Automation J — Quote Approved → Create Project + Payments
// Trigger: Quote record_updated (status changed to approved)
// Action: Create Project + Payment milestones + Update client status + Portal token
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, old_data, event } = await req.json();

    if (!data || !old_data) return Response.json({ skipped: true });
    if (data.status !== 'approved' || old_data.status === 'approved') {
      return Response.json({ skipped: true, reason: 'not an approval event' });
    }

    const quoteId = event.entity_id;
    const clientId = data.client_id;

    // Get client
    const clients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
    if (clients.length === 0) return Response.json({ skipped: true, reason: 'client not found' });
    const client = clients[0];

    // Check if ANY project already exists for this client (avoid duplicate project)
    const allClientProjects = await base44.asServiceRole.entities.Project.filter({ client_id: clientId });
    let project;
    let isNewProject = false;

    if (allClientProjects.length > 0) {
      // Prefer active project, otherwise use the first one found
      project = allClientProjects.find(p => p.status === 'active') || allClientProjects[0];
      // Re-activate if needed + sync package fields
      const pkgType = data.package_type || project.package_type || null;
      const projectUpdates = {
        package_type: pkgType,
        budget_managed_by_designer: pkgType === 'large',
      };
      if (project.status !== 'active') projectUpdates.status = 'active';
      await base44.asServiceRole.entities.Project.update(project.id, projectUpdates);
    } else {
      isNewProject = true;
      const pkgType = data.package_type || null;
      project = await base44.asServiceRole.entities.Project.create({
        client_id: clientId,
        name: data.title || `פרויקט — ${client.name}`,
        status: 'active',
        stage_current: 4,
        progress: 0,
        total_budget: data.total_amount || 0,
        start_date: new Date().toISOString().split('T')[0],
        s1_status: 'completed',
        s2_status: 'completed',
        s3_status: 'completed',
        package_type: pkgType,
        budget_managed_by_designer: pkgType === 'large',
      });
    }

    // Create default payment milestones only for new projects (avoid duplicates)
    if (isNewProject) {
      const totalAmount = data.total_amount || 0;
      const milestones = [
        { milestone: 'מקדמה', amount: Math.round(totalAmount * 0.4), milestone_stage: 1, daysOffset: 7 },
        { milestone: 'תשלום אמצע', amount: Math.round(totalAmount * 0.3), milestone_stage: 5, daysOffset: 60 },
        { milestone: 'תשלום סיום', amount: Math.round(totalAmount * 0.3), milestone_stage: 9, daysOffset: 120 },
      ];

      for (const ms of milestones) {
        const dueDate = new Date(Date.now() + ms.daysOffset * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        await base44.asServiceRole.entities.Payment.create({
          client_id: clientId,
          project_id: project.id,
          milestone: ms.milestone,
          milestone_stage: ms.milestone_stage,
          amount: ms.amount,
          amount_paid: 0,
          due_date: dueDate,
          status: 'pending',
        });
      }
    }

    // Link existing orphan records (docs, payments, tasks, meetings) to the new project
    const [orphanDocs, orphanPayments, orphanTasks, orphanMeetings] = await Promise.all([
      base44.asServiceRole.entities.Document.filter({ client_id: clientId }),
      base44.asServiceRole.entities.Payment.filter({ client_id: clientId }),
      base44.asServiceRole.entities.Task.filter({ client_id: clientId }),
      base44.asServiceRole.entities.Meeting.filter({ client_id: clientId }),
    ]);

    const linkPromises = [];
    for (const doc of orphanDocs.filter(d => !d.project_id)) {
      linkPromises.push(base44.asServiceRole.entities.Document.update(doc.id, { project_id: project.id }));
    }
    for (const pay of orphanPayments.filter(p => !p.project_id)) {
      linkPromises.push(base44.asServiceRole.entities.Payment.update(pay.id, { project_id: project.id }));
    }
    for (const task of orphanTasks.filter(t => !t.project_id)) {
      linkPromises.push(base44.asServiceRole.entities.Task.update(task.id, { project_id: project.id }));
    }
    for (const meeting of orphanMeetings.filter(m => !m.project_id)) {
      linkPromises.push(base44.asServiceRole.entities.Meeting.update(meeting.id, { project_id: project.id }));
    }
    await Promise.all(linkPromises);

    // Move client directly to active_client + generate portal token if missing
    const clientUpdates = { status: 'active_client' };
    if (!client.portal_token) {
      clientUpdates.portal_token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
      const expires = new Date();
      expires.setDate(expires.getDate() + 90);
      clientUpdates.portal_token_expires_at = expires.toISOString();
    }
    await base44.asServiceRole.entities.Client.update(clientId, clientUpdates);

    // Log "became active client" event
    await base44.asServiceRole.entities.Communication.create({
      client_id: clientId,
      project_id: project.id,
      type: 'note',
      direction: 'outbound',
      content: `הלקוחה הפכה ללקוח פעיל — הצעה אושרה, פרויקט "${project.name}" נפתח.`,
      sent_by: 'system',
      status: 'sent',
      channel: 'base44_native',
    });

    // Notify client via WhatsApp
    await base44.asServiceRole.entities.Communication.create({
      client_id: clientId,
      project_id: project.id,
      type: 'whatsapp',
      direction: 'outbound',
      content: `שלום ${client.name}! ההצעה אושרה ופרויקט "${project.name}" נפתח! 🎉 נשלח לך בקרוב קישור לפורטל האישי שלך לצפייה בהתקדמות.`,
      sent_by: 'system',
      status: 'pending',
      channel: 'base44_native',
    });

    return Response.json({ success: true, automation: 'J', projectId: project.id });
  } catch (error) {
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.Communication.create({
        client_id: '',
        type: 'system_error',
        direction: 'outbound',
        content: `Automation J (Quote Approval) failed: ${error.message}`,
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