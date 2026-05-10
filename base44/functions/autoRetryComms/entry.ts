// Automation K — Communication Retry
// Trigger: Scheduled every 5 minutes
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const failed = await base44.asServiceRole.entities.Communication.filter({ status: 'failed' });
    let retried = 0;
    let finalFailed = 0;

    for (const comm of failed) {
      if (comm.type === 'system_error') continue;
      
      const retryCount = comm.retry_count || 0;
      if (retryCount >= 99) continue;

      if (retryCount < 3) {
        await base44.asServiceRole.entities.Communication.update(comm.id, {
          status: 'pending',
          retry_count: retryCount + 1,
        });
        retried++;
      } else {
        await base44.asServiceRole.entities.Communication.update(comm.id, {
          retry_count: 99,
        });
        await base44.asServiceRole.entities.Task.create({
          title: `שליחה ידנית — ${comm.type} ל${comm.client_id ? 'לקוח' : 'מערכת'}`,
          description: `הודעת ${comm.type} נכשלה 3 פעמים. תוכן: "${(comm.content || '').slice(0, 200)}". שגיאה: ${comm.error_detail || 'לא ידוע'}`,
          type: 'manual',
          priority: 'high',
          status: 'open',
          client_id: comm.client_id || '',
          project_id: comm.project_id || '',
          due_date: new Date().toISOString().split('T')[0],
          auto_generated: true,
        });
        finalFailed++;
      }
    }

    return Response.json({ success: true, automation: 'K', retried, finalFailed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});