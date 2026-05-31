import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const clonedReq = req.clone();
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await clonedReq.json();

    if (!data || !old_data) return Response.json({ skipped: 'no data' });

    // רק כשסטטוס השתנה ל-completed
    if (data.status !== 'completed' || old_data.status === 'completed') {
      return Response.json({ skipped: 'not newly completed' });
    }

    const type = data.type;
    if (!['site_visit', 'installation_day', 'shopping_day'].includes(type)) {
      return Response.json({ skipped: 'not a days type' });
    }

    if (!data.project_id) return Response.json({ skipped: 'no project_id' });

    const allProjects = await base44.asServiceRole.entities.Project.filter({});
    const project = allProjects.find(p => p.id === data.project_id);
    if (!project) return Response.json({ skipped: 'project not found' });

    const isSup = type === 'site_visit';
    const isInst = type === 'installation_day';
    const actualKey = isSup ? 'supervision_days_actual' : isInst ? 'installation_days_actual' : 'shopping_days_actual';
    const itemPrefix = isSup ? 's11_sup_' : isInst ? 's12_inst_' : 's9_shopping_';
    const stageNum = isSup ? 11 : isInst ? 12 : 9;

    const currentActual = project[actualKey] || 0;
    const newActual = currentActual + 1;

    // עדכן days_actual
    await base44.asServiceRole.entities.Project.update(project.id, {
      [actualKey]: newActual,
    });

    // סמן את הפריט הבא בצ'קליסט אוטומטית
    const checklistData = project.stage_checklist_data
      ? JSON.parse(project.stage_checklist_data)
      : {};
    if (!checklistData[stageNum]) checklistData[stageNum] = {};
    const itemId = `${itemPrefix}${newActual}`;
    checklistData[stageNum][itemId] = true;

    await base44.asServiceRole.entities.Project.update(project.id, {
      stage_checklist_data: JSON.stringify(checklistData),
    });

    return Response.json({ success: true, itemMarked: itemId, newActual });
  } catch (error) {
    console.error('autoMeetingDaysTracker error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});