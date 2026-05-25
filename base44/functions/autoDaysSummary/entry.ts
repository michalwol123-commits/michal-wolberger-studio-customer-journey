import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Entity automation: Project update
// Fires when shopping_days_actual / supervision_days_actual / installation_days_actual increases
// Sends client a summary email

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    if (!data || !old_data) return Response.json({ skipped: 'no data' });

    const projectId = event.entity_id;

    // Check which day type was incremented
    const dayTypes = [
      { actualKey: 'shopping_days_actual', label: 'יום קניות', emoji: '🛒' },
      { actualKey: 'supervision_days_actual', label: 'יום פיקוח', emoji: '👁️' },
      { actualKey: 'installation_days_actual', label: 'יום התקנה', emoji: '🔨' },
    ];

    const incremented = dayTypes.filter(dt => {
      const newVal = data[dt.actualKey] || 0;
      const oldVal = old_data[dt.actualKey] || 0;
      return newVal > oldVal;
    });

    if (incremented.length === 0) return Response.json({ skipped: 'no day incremented' });

    // Get client
    if (!data.client_id) return Response.json({ skipped: 'no client' });
    const clients = await base44.asServiceRole.entities.Client.filter({ id: data.client_id });
    const client = clients[0];
    if (!client?.email) return Response.json({ skipped: 'no client email' });

    const today = new Date().toLocaleDateString('he-IL');
    const summaryLines = incremented.map(dt => {
      const actual = data[dt.actualKey] || 0;
      const plannedKey = dt.actualKey.replace('_actual', '_planned');
      const planned = data[plannedKey] || 0;
      return `${dt.emoji} ${dt.label} #${actual} (מתוך ${planned} מתוכננים)`;
    }).join('<br>');

    // Send summary email
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    if (BREVO_API_KEY) {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: { name: 'סטודיו מיכל וולברגר', email: 'michalwol123@gmail.com' },
          to: [{ email: client.email }],
          subject: `סיכום יום — ${data.name || 'פרויקט'}`,
          htmlContent: `<div dir="rtl" style="font-family:Arial,sans-serif;padding:20px;max-width:500px;">
            <div style="background:#8B7355;padding:16px 24px;border-radius:8px 8px 0 0;">
              <h2 style="color:white;margin:0;font-size:18px;">סיכום יום ✓</h2>
            </div>
            <div style="background:white;padding:20px 24px;border:1px solid #e8e0d5;border-top:none;border-radius:0 0 8px 8px;">
              <p>שלום ${client.name},</p>
              <p>עדכון מהפרויקט <strong>${data.name || ''}</strong> — ${today}:</p>
              <div style="background:#FAF8F5;padding:12px 16px;border-radius:8px;margin:12px 0;font-size:15px;">
                ${summaryLines}
              </div>
              <p style="color:#666;font-size:13px;">תוכלי לעקוב אחרי ההתקדמות בפורטל הלקוח.</p>
            </div>
          </div>`
        })
      });
    }

    // Log communication
    await base44.asServiceRole.entities.Communication.create({
      client_id: data.client_id,
      project_id: projectId,
      type: 'email',
      direction: 'outbound',
      content: `סיכום יום: ${incremented.map(d => d.label).join(', ')}`,
      sent_by: 'system',
      status: 'sent',
      channel: 'base44_native',
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('autoDaysSummary error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});