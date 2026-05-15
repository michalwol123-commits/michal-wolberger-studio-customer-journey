import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    // Only run when concept_status changed to 'approved'
    if (data?.concept_status !== 'approved' || old_data?.concept_status === 'approved') {
      return Response.json({ skipped: true });
    }

    const projectId = event.entity_id;

    // Get client info
    let clientName = 'הלקוחה';
    if (data.client_id) {
      const clients = await base44.asServiceRole.entities.Client.filter({ id: data.client_id });
      if (clients[0]) clientName = clients[0].name || clientName;
    }

    // Update stage 8 to completed
    await base44.asServiceRole.entities.Project.update(projectId, { s8_status: 'completed' });

    // Create task
    await base44.asServiceRole.entities.Task.create({
      project_id: projectId,
      title: `לקוחה אישרה קונספט — ${clientName}`,
      description: 'הלקוחה אישרה את לוח ההשראה. ניתן לעבור לשלב הבא.',
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
        content: `${clientName} אישרה את הקונספט העיצובי דרך הפורטל`,
        sent_by: 'client',
        channel: 'base44_native',
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('autoConceptApproval error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});