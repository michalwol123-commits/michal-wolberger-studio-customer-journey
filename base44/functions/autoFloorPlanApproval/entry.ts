import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    // Only run when floor_plan_locked changed to true
    if (!data?.floor_plan_locked || old_data?.floor_plan_locked === true) {
      return Response.json({ skipped: true });
    }

    const projectId = event.entity_id;

    // Get client info
    let clientName = 'הלקוח/ה';
    if (data.client_id) {
      const clients = await base44.asServiceRole.entities.Client.filter({ id: data.client_id });
      if (clients[0]) clientName = clients[0].name || clientName;
    }

    // Create task for Michal
    await base44.asServiceRole.entities.Task.create({
      project_id: projectId,
      client_id: data.client_id || undefined,
      title: `תכנית העמדה אושרה — ${clientName}`,
      description: 'הלקוח/ה אישר/ה את תכנית העמדה דרך הפורטל. ניתן להמשיך לשלב הבא.',
      type: 'manual',
      status: 'open',
      priority: 'high',
      due_date: new Date().toISOString().split('T')[0],
    });

    // Log communication
    if (data.client_id) {
      await base44.asServiceRole.entities.Communication.create({
        client_id: data.client_id,
        project_id: projectId,
        type: 'note',
        direction: 'inbound',
        content: `${clientName} אישר/ה את תכנית העמדה דרך הפורטל`,
        sent_by: 'client',
        channel: 'base44_native',
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('autoFloorPlanApproval error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});