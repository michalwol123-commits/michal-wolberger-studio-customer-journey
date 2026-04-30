import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const projects = await base44.asServiceRole.entities.Project.filter({ status: 'active' });
    const activeProjectIds = projects.map(p => p.id);
    const milestones = await base44.asServiceRole.entities.ProjectMilestone.filter({});

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    let alertsCreated = 0;

    for (const milestone of milestones) {
      if (!activeProjectIds.includes(milestone.project_id)) continue;
      if (milestone.status === 'completed' || milestone.status === 'delayed') continue;
      if (!milestone.end_date || new Date(milestone.end_date) >= now) continue;

      // Mark as delayed
      await base44.asServiceRole.entities.ProjectMilestone.update(milestone.id, {
        status: 'delayed',
      });

      const project = projects.find(p => p.id === milestone.project_id);

      // Check if alert already exists today
      const existingTasks = await base44.asServiceRole.entities.Task.filter({
        project_id: milestone.project_id,
        type: 'automation_failed',
      });
      const alreadyAlerted = existingTasks.some(t =>
        t.title?.includes(milestone.title) && t.created_date?.startsWith(today)
      );
      if (alreadyAlerted) continue;

      // Create alert task
      await base44.asServiceRole.entities.Task.create({
        project_id: milestone.project_id,
        client_id: project?.client_id,
        title: `עיכוב באבן דרך: "${milestone.title}" — ${project?.name || 'פרויקט'}`,
        description: `תאריך סיום מתוכנן: ${milestone.end_date}\nהסטטוס עודכן ל-"מעוכב"`,
        type: 'automation_failed',
        priority: 'high',
        status: 'open',
        due_date: today,
        auto_generated: true,
      });

      alertsCreated++;
    }

    return Response.json({ success: true, alertsCreated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});