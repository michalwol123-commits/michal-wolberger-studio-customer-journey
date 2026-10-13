// Agent tool: advance a project to a target stage through the same path as the "advance stage" button.
// One update: stage_current + s{n}_status=completed for stages between current and target.
// autoStageAdvance handles the rest (s{target}_status, progress, task, client notification).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { project_id, target_stage } = await req.json();
  const target = Number(target_stage);
  if (!project_id || !Number.isInteger(target) || target < 1 || target > 13) {
    return Response.json({ error: 'project_id and target_stage (1-13) required' }, { status: 400 });
  }

  const project = await base44.asServiceRole.entities.Project.get(project_id);
  const current = project.stage_current || 1;
  if (target <= current) {
    return Response.json({ error: `target_stage (${target}) must be greater than current stage (${current})` }, { status: 400 });
  }

  const updates = { stage_current: target };
  for (let n = current; n < target; n++) updates[`s${n}_status`] = 'completed';
  await base44.asServiceRole.entities.Project.update(project_id, updates);

  const saved = await base44.asServiceRole.entities.Project.get(project_id);
  return Response.json({ success: true, previous_stage: current, stage_current: saved.stage_current });
});