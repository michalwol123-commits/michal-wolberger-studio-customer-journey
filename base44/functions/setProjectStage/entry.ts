// The one way to move a project between stages — used by the screen (advance button, "move to stage")
// and by the WhatsApp agent.
// Forward or backward, one stage or a jump. Stages jumped over become 'skipped' (shown in the portal in soft grey,
// still reachable), the stage being left becomes completed / skipped / pending, the target becomes in_progress.
// Everything is written in one Project update together with last_stage_change, so autoStageAdvance only sends
// the client update (or nothing, when notify_client is false) and creates the prep task.
// dry_run (default true) returns what would happen, in Hebrew, without changing anything.
import { stageName, stageUpdateMessage, TOTAL_STAGES } from '../../shared/stages.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Required checklist items per stage (mirror of src/lib/stageChecklist.js), used by mode=advance.
const REQUIRED = {
  4: { s4_1: 'אישור לקוח — בחירת חבילה', s4_2a: 'שליחת הסכם לחתימה', s4_2b: 'הסכם חתום', s4_3: 'תשלום ראשון — מקדמה' },
  5: { s5_1: 'שליחת שאלון מפורט ללקוח', s5_2: 'מילוי השאלון ע"י הלקוח' },
  6: { s6_1: 'הכנת תכנית העמדה', s6_2: 'שליחת התכניות ללקוח לבחירה', s6_4: 'אישור הלקוח + חתימה דיגיטלית' },
  7: { s7_1: 'תכנית חשמל', s7_2: 'תכנית אינסטלציה', s7_6: 'אישור לקוח על התכניות' },
  8: { s8_1: 'יצירת מודבורד', s8_2: 'הדמיות / רנדרים', s8_3: 'אישור קונספט ע"י הלקוח' },
  9: { s9_1: 'תכנון ימי קניות' },
  10: { s10_2: 'השוואה ובחירת ספקים' },
  11: { s11_1: 'תיאום ימי פיקוח' },
  12: { s12_1: 'תיאום התקנות', s12_2: 'ביצוע התקנה', s12_3: 'בדיקות איכות', s12_5: 'קבלת לקוח — אישור סופי' },
  13: { s13_2: 'סגירה פיננסית — כל התשלומים שולמו' },
};
const STATUS_HE = { completed: 'הושלם', skipped: 'דולג', pending: 'ממתין', in_progress: 'בביצוע' };

function missingRequired(project, stage) {
  const req = REQUIRED[stage];
  if (!req) return [];
  let data = {};
  try { data = JSON.parse(project.stage_checklist_data || '{}')[stage] || {}; } catch { /* empty */ }
  return Object.entries(req).filter(([id]) => !data[id]).map(([, label]) => label);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const fail = (error, extra = {}) => Response.json({ ok: false, error, ...extra });
    const target = Number(body.target_stage);
    if (!body.project_id || !Number.isInteger(target) || target < 1 || target > TOTAL_STAGES) {
      return fail(`project_id ו-target_stage (1-${TOTAL_STAGES}) חובה`);
    }
    const db = base44.asServiceRole.entities;
    const project = await db.Project.get(body.project_id).catch(() => null);
    if (!project) return fail('הפרויקט לא נמצא');
    const current = project.stage_current || 1;
    if (target === current) return fail(`הפרויקט כבר בשלב ${current} (${stageName(current)})`);

    const forward = target > current;
    const mode = body.mode || (target === current + 1 ? 'advance' : 'jump');
    const dryRun = body.dry_run !== false;
    const notify = body.notify_client ?? forward;
    const leaveAs = body.leave_current_as || (forward ? 'completed' : 'pending');
    if (!['completed', 'skipped', 'pending'].includes(leaveAs)) return fail('leave_current_as: completed / skipped / pending');

    const missing = forward ? missingRequired(project, current) : [];
    if (mode === 'advance' && forward && missing.length && leaveAs === 'completed') {
      return fail(`בשלב ${current} לא סומנו פריטי חובה בצ'קליסט: ${missing.join(', ')}.`, {
        missing, hint: 'אפשר לעבור בכל זאת עם mode=jump (ואז לבחור אם השלב הנוכחי "הושלם" או "דולג").',
      });
    }

    // ---- the new state ----
    const updates = { stage_current: target };
    const before = (n) => project[`s${n}_status`] || 'pending';
    const skipped = [];
    updates[`s${current}_status`] = leaveAs === 'pending' && before(current) === 'completed' ? 'completed' : leaveAs;
    if (forward) {
      for (let n = current + 1; n < target; n++) {
        if (before(n) !== 'completed') { updates[`s${n}_status`] = 'skipped'; skipped.push(n); }
      }
    }
    updates[`s${target}_status`] = 'in_progress';
    updates.progress = target >= TOTAL_STAGES ? 100 : Math.round((target / TOTAL_STAGES) * 100);
    updates.last_stage_change = JSON.stringify({
      from: current, to: target, mode, skipped, leave_current_as: updates[`s${current}_status`],
      notify_client: !!notify, by: user.email, at: new Date().toISOString(),
    });

    // ---- what it means, in plain Hebrew ----
    const client = await db.Client.get(project.client_id).catch(() => null);
    const consequences = [
      `הפרויקט "${project.name}" יעבור משלב ${current} (${stageName(current)}) לשלב ${target} (${stageName(target)}).`,
      `שלב ${current} יסומן "${STATUS_HE[updates[`s${current}_status`]]}".`,
    ];
    if (skipped.length) {
      consequences.push(`${skipped.length > 1 ? 'שלבים' : 'שלב'} ${skipped.join(', ')} ${skipped.length > 1 ? 'יסומנו' : 'יסומן'} "דולג". בפורטל הם יופיעו באפור עדין ("לא נדרש בפרויקט שלכם"), ואפשר יהיה לחזור אליהם בכל רגע.`);
    }
    if (missing.length) consequences.push(`שימי לב: בשלב ${current} לא סומנו פריטי חובה בצ'קליסט: ${missing.join(', ')}.`);
    if (notify) consequences.push(`הלקוח יקבל וואטסאפ: "${stageUpdateMessage(client?.name || 'לקוח', target)}"`);
    else consequences.push('ללקוח לא תישלח הודעה.');
    if (forward) consequences.push(`תיווצר משימה "הכנה לשלב ${target} — ${stageName(target)}" לעוד יומיים.`);

    // Side effects of stage statuses (the same automations the screen triggers)
    const becomes = (n, s) => updates[`s${n}_status`] === s && before(n) !== s;
    if (becomes(4, 'completed')) consequences.push('שלב 4 מסומן "הושלם": ללקוח יישלח מייל "ברוכים הבאים", הוא יסומן כלקוח פעיל, וייווצרו אבני דרך בגאנט (אם עוד אין).');
    if (updates.s4_status === 'skipped' && before(4) !== 'completed') consequences.push('שלב 4 מדולג: לא יישלח מייל "ברוכים הבאים" ולא ייווצרו אבני דרך.');
    if (becomes(5, 'completed') && client?.status === 'lead') consequences.push('שלב 5 מסומן "הושלם" והלקוח עדיין ליד: הוא יעבור ל"מתעניין", וייתכן שייווצר תשלום על פגישה.');
    if (becomes(2, 'completed')) consequences.push('שלב 2 מסומן "הושלם": תיווצר משימה "הכנת הצעת מחיר".');
    if (!forward) consequences.push('חזרה אחורה לא משנה את השלבים שאחרי, ולא מבטלת שום דבר שכבר נשלח.');

    const preview = { from: current, to: target, mode, skipped, statuses: Object.fromEntries(Object.entries(updates).filter(([k]) => /^s\d+_status$/.test(k))) };
    if (dryRun) return Response.json({ ok: true, dry_run: true, preview, consequences, missing_required: missing });

    await base44.entities.Project.update(project.id, updates);

    // Keep Gantt milestones in line with the stage statuses.
    const milestones = await db.ProjectMilestone.filter({ project_id: project.id });
    for (const m of milestones) {
      const s = updates[`s${m.stage}_status`];
      if (!s || m.status === s) continue;
      if (s === 'in_progress' && m.status === 'completed') continue;
      await db.ProjectMilestone.update(m.id, { status: s === 'skipped' ? 'skipped' : s });
    }

    const saved = await db.Project.get(project.id);
    return Response.json({
      ok: true, dry_run: false, consequences,
      stage_current: saved.stage_current,
      statuses: Object.fromEntries(Array.from({ length: TOTAL_STAGES }, (_, i) => [i + 1, saved[`s${i + 1}_status`] || 'pending'])),
    });
  } catch (error) {
    console.error('setProjectStage error:', error.message);
    return Response.json({ ok: false, error: error.message });
  }
});
