// Automation: Welcome email + status update when project stage 4 (signing) is completed
// Trigger: Project update — s4_status → completed
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, old_data, event } = await req.json();

    if (!data || !old_data) return Response.json({ skipped: true });
    if (data.s4_status !== 'completed' || old_data.s4_status === 'completed') {
      return Response.json({ skipped: true, reason: 's4 not newly completed' });
    }

    const projectId = event.entity_id;
    const clientId = data.client_id;

    // Get client details
    const clients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
    const client = clients[0];
    if (!client) return Response.json({ skipped: true, reason: 'client not found' });

    // Update client status to active_client
    const statusUpdate = { status: 'active_client' };
    if (client.status !== 'active_client') {
      await base44.asServiceRole.entities.Client.update(clientId, statusUpdate);
    }

    // Send welcome email
    if (client.email) {
      const portalUrl = client.portal_token
        ? `${Deno.env.get('BASE44_APP_URL') || ''}/portal?token=${client.portal_token}`
        : '';

      const emailBody = `
        <div dir="rtl" style="font-family: 'Heebo', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8B6F47;">ברוכים הבאים! 🎉</h1>
          <p>שלום ${client.name},</p>
          <p>שמחים לבשר לך שהפרויקט <strong>"${data.name}"</strong> נסגר רשמית ואנחנו מתחילים לעבוד!</p>
          <h3>מה הלאה?</h3>
          <ul>
            <li>📋 שאלון מפורט — כדי שנבין בדיוק מה את/ה צריכ/ה</li>
            <li>📅 תכנון לוח זמנים ותקציב</li>
            <li>🎨 קונספט עיצובי מותאם אישית</li>
          </ul>
          ${portalUrl ? `
          <p>את/ה מוזמנ/ת לעקוב אחרי ההתקדמות בפורטל האישי:</p>
          <p><a href="${portalUrl}" style="display: inline-block; background: #8B6F47; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">כניסה לפורטל</a></p>
          ` : ''}
          <p>נשמח לענות על כל שאלה!</p>
          <p style="color: #666; font-size: 14px;">בברכה,<br>צוות העיצוב</p>
        </div>
      `;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: client.email,
        subject: `ברוכים הבאים לפרויקט "${data.name}" 🎉`,
        body: emailBody,
      });
    }

    // Log communication
    await base44.asServiceRole.entities.Communication.create({
      client_id: clientId,
      project_id: projectId,
      type: 'email',
      direction: 'outbound',
      content: `הודעת ברוכים הבאים נשלחה ל-${client.name} (${client.email || 'ללא מייל'}) לאחר סגירת פרויקט "${data.name}"`,
      sent_by: 'system',
      status: client.email ? 'sent' : 'failed',
      channel: 'base44_native',
    });

    return Response.json({ success: true, email_sent: !!client.email });
  } catch (error) {
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.Communication.create({
        client_id: '',
        type: 'system_error',
        direction: 'outbound',
        content: `autoWelcomeClient failed: ${error.message}`,
        sent_by: 'system',
        status: 'failed',
        channel: 'base44_native',
        error_detail: error.message,
      });
    } catch (_) { /* silent */ }
    return Response.json({ error: error.message }, { status: 500 });
  }
});