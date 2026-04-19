// Automation D — Stage Advance Notification
// Trigger: Project record_updated (stage_current changed)
// Action: Communication (pending) to client + Task for next stage prep
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const STAGE_NAMES = {
  1: 'שאלון',
  2: 'פגישת תכנית + גאנט/תקציב',
  3: 'תכניות עבודה',
  4: 'קונספט עיצובי + רנדרים',
  5: 'ימי קניות',
  6: 'תמחור קבלנים + בחירת ספקים',
  7: 'ביצוע + ימי פיקוח',
  8: 'ימי התקנה + תיאום ספקים',
  9: 'מסירה וסיום',
};

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
    const stageName = STAGE_NAMES[newStage] || `שלב ${newStage}`;

    // Update stage statuses: mark previous stage as completed, new stage as in_progress
    const stageUpdates = {};
    if (oldStage >= 1 && oldStage <= 9) {
      stageUpdates[`s${oldStage}_status`] = 'completed';
    }
    if (newStage >= 1 && newStage <= 9) {
      stageUpdates[`s${newStage}_status`] = 'in_progress';
    }
    // Calculate progress based on completed stages
    stageUpdates.progress = Math.round(((newStage - 1) / 9) * 100);
    
    await base44.asServiceRole.entities.Project.update(projectId, stageUpdates);

    // Get client
    const clients = await base44.asServiceRole.entities.Client.filter({ id: data.client_id });
    const clientName = clients[0]?.name || 'לקוח';
    const clientId = data.client_id;

    // Notify client
    await base44.asServiceRole.entities.Communication.create({
      client_id: clientId,
      project_id: projectId,
      type: 'whatsapp',
      direction: 'outbound',
      content: `שלום ${clientName}! עדכון מהפרויקט: עברנו לשלב ${newStage} — ${stageName}. נעדכן אותך על ההתקדמות 🎉`,
      sent_by: 'system',
      status: 'pending',
      channel: 'base44_native',
    });

    // Create prep task for new stage
    await base44.asServiceRole.entities.Task.create({
      title: `הכנה לשלב ${newStage} — ${stageName}`,
      description: `הפרויקט "${data.name}" התקדם לשלב ${newStage}. יש להכין את החומרים הנדרשים.`,
      type: 'manual',
      priority: 'normal',
      status: 'open',
      client_id: clientId,
      project_id: projectId,
      related_stage: newStage,
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      auto_generated: true,
    });

    return Response.json({ success: true, automation: 'D', stage: newStage });
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