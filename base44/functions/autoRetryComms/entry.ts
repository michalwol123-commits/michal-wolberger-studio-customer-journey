// Automation K — Communication Retry
// Trigger: Scheduled every 5 minutes
// Condition: Communication with status=failed AND retry_count<3
// Action: Reset to pending for re-send, or mark final failure + create manual Task
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const failed = await base44.asServiceRole.entities.Communication.filter({ status: 'failed' });
    let retried = 0;
    let finalFailed = 0;

    for (const comm of failed) {
      // Skip system_error logs — those are not retryable messages
      if (comm.type === 'system_error') continue;
      
      const retryCount = comm.retry_count || 0;

      if (retryCount < 3) {
        // Reset to pending for the sender automation to pick up again
        await base44.asServiceRole.entities.Communication.update(comm.id, {
          status: 'pending',
          retry_count: retryCount + 1,
        });
        retried++;
      } else {
        // Final failure — create manual task
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

        // Mark as permanently failed (retry_count stays at 3+, status stays failed)
        // We set retry_count to 99 to prevent re-processing
        await base44.asServiceRole.entities.Communication.update(comm.id, {
          retry_count: 99,
        });
        finalFailed++;
      }
    }

    return Response.json({ success: true, automation: 'K', retried, finalFailed });
  } catch (error) {
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.Communication.create({
        client_id: '',
        type: 'system_error',
        direction: 'outbound',
        content: `Automation K (Retry) failed: ${error.message}`,
        sent_by: 'system',
        status: 'failed',
        channel: 'base44_native',
        error_detail: error.message,
        retry_count: 99,
      });
    } catch (_) { /* silent */ }
    return Response.json({ error: error.message }, { status: 500 });
  }
});