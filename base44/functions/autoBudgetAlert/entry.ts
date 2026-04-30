import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const projects = await base44.asServiceRole.entities.Project.filter({ status: 'active' });
    const budgetItems = await base44.asServiceRole.entities.BudgetItem.filter({});

    let alertsCreated = 0;

    for (const project of projects) {
      const items = budgetItems.filter(b => b.project_id === project.id);
      if (items.length === 0) continue;

      const totalPlanned = items.reduce((s, b) => s + (b.planned_amount || 0), 0);
      const totalActual = items.reduce((s, b) => s + (b.actual_amount || 0), 0);

      if (totalPlanned <= 0 || totalActual <= totalPlanned * 1.1) continue;

      const overrunPct = Math.round(((totalActual - totalPlanned) / totalPlanned) * 100);
      const diff = totalActual - totalPlanned;

      // Check if we already created an alert today for this project
      const today = new Date().toISOString().slice(0, 10);
      const existingTasks = await base44.asServiceRole.entities.Task.filter({
        project_id: project.id,
        type: 'automation_failed',
      });
      const alreadyAlerted = existingTasks.some(t => 
        t.title?.includes('חריגת תקציב') && t.created_date?.startsWith(today)
      );
      if (alreadyAlerted) continue;

      // Create alert task
      await base44.asServiceRole.entities.Task.create({
        project_id: project.id,
        client_id: project.client_id,
        title: `חריגת תקציב ${overrunPct}% — ${project.name}`,
        description: `תקציב מתוכנן: ₪${totalPlanned.toLocaleString()}\nבפועל: ₪${totalActual.toLocaleString()}\nחריגה: ₪${diff.toLocaleString()} (${overrunPct}%)`,
        type: 'automation_failed',
        priority: overrunPct > 25 ? 'urgent' : 'high',
        status: 'open',
        due_date: new Date().toISOString().slice(0, 10),
        auto_generated: true,
      });

      // Log communication
      await base44.asServiceRole.entities.Communication.create({
        client_id: project.client_id,
        project_id: project.id,
        type: 'system_error',
        direction: 'outbound',
        content: `[אוטומציה] חריגת תקציב ${overrunPct}% בפרויקט "${project.name}" — הפרש ₪${diff.toLocaleString()}`,
        sent_by: 'system',
        status: 'sent',
        channel: 'base44_native',
      });

      alertsCreated++;
    }

    return Response.json({ success: true, alertsCreated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});