// Agent tool: an AI render for a project's inspiration board (the same "רנדר AI" as the screen,
// InspirationBoardEditor). The render is saved hidden from the client (is_approved=false);
// Michal publishes it when she wants.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_URL = 'https://michal-design-flow.base44.app';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { project_id, prompt, room, title } = await req.json();
    if (!project_id || !String(prompt || '').trim()) return Response.json({ ok: false, error: 'project_id ו-prompt חובה' });
    const project = await base44.asServiceRole.entities.Project.get(project_id).catch(() => null);
    if (!project) return Response.json({ ok: false, error: 'הפרויקט לא נמצא' });

    const result = await base44.integrations.Core.GenerateImage({ prompt: String(prompt).trim() });
    if (!result?.url) return Response.json({ ok: false, error: 'יצירת התמונה נכשלה' });

    const existing = await base44.asServiceRole.entities.InspirationItem.filter({ project_id });
    const item = await base44.entities.InspirationItem.create({
      project_id,
      uploader_role: 'staff',
      type: 'render',
      file_url: result.url,
      ai_prompt: String(prompt).trim(),
      title: title || `רנדר AI: ${String(prompt).trim().substring(0, 40)}`,
      ...(room ? { room } : {}),
      is_approved: false,
      order: existing.length,
    });
    return Response.json({
      ok: true,
      item_id: item.id,
      image_url: result.url,
      board_link: `${APP_URL}/projects/${project_id}?stage=8`,
      note: 'הרנדר נשמר בלוח ההשראה ועדיין לא גלוי ללקוח.',
    });
  } catch (error) {
    console.error('agentGenerateRender error:', error.message);
    return Response.json({ ok: false, error: error.message });
  }
});
