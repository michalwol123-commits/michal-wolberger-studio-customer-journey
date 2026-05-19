// Automation: Welcome email + status update when project stage 4 (signing) is completed
// Trigger: Project update — s4_status → completed
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    let projectId, clientId, projectName;

    // Support two invocation modes:
    // 1. Manual (from checklist button): { client_id, project_id }
    // 2. Automation (entity trigger): { data, old_data, event }
    if (body.client_id && body.project_id) {
      // Manual invocation from checklist
      clientId = body.client_id;
      projectId = body.project_id;
      const projects = await base44.asServiceRole.entities.Project.filter({ id: projectId });
      if (!projects[0]) return Response.json({ skipped: true, reason: 'project not found' });
      projectName = projects[0].name;
    } else {
      // Automation invocation
      const { data, old_data, event } = body;
      if (!data || !old_data) return Response.json({ skipped: true });
      if (data.s4_status !== 'completed' || old_data.s4_status === 'completed') {
        return Response.json({ skipped: true, reason: 's4 not newly completed' });
      }
      projectId = event.entity_id;
      clientId = data.client_id;
      projectName = data.name;
    }

    // Get client details
    const clients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
    const client = clients[0];
    if (!client) return Response.json({ skipped: true, reason: 'client not found' });

    // Update client status to active_client
    const statusUpdate = { status: 'active_client' };
    if (client.status !== 'active_client') {
      await base44.asServiceRole.entities.Client.update(clientId, statusUpdate);
    }

    // Create default milestones for the Gantt chart
    const existingMilestones = await base44.asServiceRole.entities.ProjectMilestone.filter({ project_id: projectId });
    if (existingMilestones.length === 0) {
      const startDate = new Date();
      const defaultDurations = [3, 5, 7, 7, 7, 14, 14, 14, 10, 10, 30, 14, 7];
      const stageLabels = [
        'קשר ראשוני', 'שיחת היכרות', 'הצעת מחיר', 'סגירת פרויקט',
        'שאלון מפורט', 'תכנית + גאנט/תקציב', 'תכניות עבודה',
        'קונספט עיצובי + רנדרים', 'ימי קניות', 'תמחור קבלנים + ספקים',
        'ביצוע בשטח + פיקוח', 'התקנה + ספקים', 'סיום ומסירה',
      ];
      const stageColors = [
        '#9CA3AF','#9CA3AF','#9CA3AF','#9CA3AF',
        '#3B82F6','#8B5CF6','#8B5CF6','#EC4899',
        '#F59E0B','#F59E0B','#EF4444','#EF4444','#10B981',
      ];

      let cursor = new Date(startDate);
      // Stages 1-4 already passed — set them before project start
      const fmt = (d) => d.toISOString().split('T')[0];
      const milestonesToCreate = [];

      for (let i = 0; i < 13; i++) {
        const stageNum = i + 1;
        const duration = defaultDurations[i];
        const msStart = new Date(cursor);
        const msEnd = new Date(cursor);
        msEnd.setDate(msEnd.getDate() + duration - 1);

        let status = 'pending';
        if (stageNum <= 4) status = 'completed';
        else if (stageNum === 5) status = 'in_progress';

        milestonesToCreate.push({
          project_id: projectId,
          title: stageLabels[i],
          stage: stageNum,
          start_date: fmt(msStart),
          end_date: fmt(msEnd),
          status,
          color: stageColors[i],
        });

        cursor = new Date(msEnd);
        cursor.setDate(cursor.getDate() + 1);
      }

      await base44.asServiceRole.entities.ProjectMilestone.bulkCreate(milestonesToCreate);
    }

    // Send welcome email
    if (client.email) {
      const appUrl = Deno.env.get('BASE44_APP_URL') || 'https://michal-design-flow.base44.app';
      const portalUrl = client.portal_token
        ? `${appUrl}/portal?token=${client.portal_token}`
        : '';

      const emailBody = `
        <div dir="rtl" style="font-family: 'Heebo', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8B6F47;">ברוכים הבאים! 🎉</h1>
          <p>שלום ${client.name},</p>
          <p>שמחים לבשר לך שהפרויקט <strong>"${projectName}"</strong> נסגר רשמית ואנחנו מתחילים לעבוד!</p>
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

      const subject = `ברוכים הבאים לפרויקט "${projectName}" 🎉`;
      const { accessToken: gmailToken } = await base44.asServiceRole.connectors.getConnection('gmail');
      const subjectEncoded = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
      const emailRaw = [
        `From: "סטודיו מיכל וולברגר" <me>`,
        `To: ${client.email}`,
        `Subject: ${subjectEncoded}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=utf-8`,
        ``,
        emailBody
      ].join('\r\n');
      const raw = btoa(unescape(encodeURIComponent(emailRaw)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${gmailToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw }),
      });
      if (!gmailRes.ok) throw new Error(`Gmail error: ${JSON.stringify(await gmailRes.json())}`);
    }

    // Log communication
    await base44.asServiceRole.entities.Communication.create({
      client_id: clientId,
      project_id: projectId,
      type: 'email',
      direction: 'outbound',
      content: `הודעת ברוכים הבאים נשלחה ל-${client.name} (${client.email || 'ללא מייל'}) לאחר סגירת פרויקט "${projectName}"`,
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