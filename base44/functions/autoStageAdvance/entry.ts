// Automation D — Stage Advance Notification
// Trigger: Project record_updated (stage_current changed)
// setProjectStage writes all stage statuses itself, together with last_stage_change; then this only sends the
// client update (unless notify_client is false) and creates the prep task. Any other writer of stage_current
// still gets the statuses filled here.
import { israelToday } from '../../shared/israelTime.ts';
import { stageName, stageUpdateMessage, TOTAL_STAGES } from '../../shared/stages.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, old_data, event } = await req.json();

    if (!data || !old_data) return Response.json({ skipped: true });
    if (data.stage_current === old_data.stage_current) {
      return Response.json({ skipped: true, reason: 'stage unchanged' });
    }

    const projectId = event.entity_id;
    const oldStage = old_data.stage_current;
    const newStage = data.stage_current;
    const forward = newStage > oldStage;
    const name = stageName(newStage);

    let change = null;
    try { change = JSON.parse(data.last_stage_change || 'null'); } catch { /* not set */ }
    const fromSetProjectStage = !!change && change.from === oldStage && change.to === newStage;

    if (!fromSetProjectStage) {
      const stageUpdates = {};
      if (forward && oldStage >= 1 && oldStage <= TOTAL_STAGES) stageUpdates[`s${oldStage}_status`] = 'completed';
      if (newStage >= 1 && newStage <= TOTAL_STAGES) stageUpdates[`s${newStage}_status`] = 'in_progress';
      stageUpdates.progress = newStage >= TOTAL_STAGES ? 100 : Math.round((newStage / TOTAL_STAGES) * 100);
      await base44.asServiceRole.entities.Project.update(projectId, stageUpdates);
    }

    const notify = fromSetProjectStage ? change.notify_client !== false : forward;
    if (!notify && !forward) return Response.json({ success: true, automation: 'D', stage: newStage, notified: false });

    // Get client
    const clients = await base44.asServiceRole.entities.Client.filter({ id: data.client_id });
    const clientName = clients[0]?.name || 'לקוח';
    const clientId = data.client_id;

    // Notify client
    if (notify) await base44.asServiceRole.entities.Communication.create({
      client_id: clientId,
      project_id: projectId,
      type: 'whatsapp',
      direction: 'outbound',
      content: stageUpdateMessage(clientName, newStage),
      sent_by: 'system',
      status: 'pending',
      channel: 'base44_native',
    });

    // Create prep task for new stage (moving forward only)
    if (forward) await base44.asServiceRole.entities.Task.create({
      title: `הכנה לשלב ${newStage} — ${name}`,
      description: `הפרויקט "${data.name}" התקדם לשלב ${newStage}. יש להכין את החומרים הנדרשים.`,
      type: 'manual',
      priority: 'normal',
      status: 'open',
      client_id: clientId,
      project_id: projectId,
      related_stage: newStage,
      due_date: israelToday(2),
      auto_generated: true,
    });

    return Response.json({ success: true, automation: 'D', stage: newStage, notified: notify });
  } catch (error) {
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.Communication.create({
        client_id: '',
        type: 'system_error',
        direction: 'outbound',
        content: `Automation D (Stage Advance) failed: ${error.message}`,
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