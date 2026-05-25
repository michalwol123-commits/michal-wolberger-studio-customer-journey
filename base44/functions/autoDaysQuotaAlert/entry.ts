import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Entity automation: Project update
// Fires when actual days reach planned - 1 (or more)
// Creates task for Michal + notifies client via email

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    if (!data || !old_data) return Response.json({ skipped: 'no data' });

    const projectId = event.entity_id;

    // Check each day type: did we just cross the threshold?
    const dayTypes = [
      { key: 'shopping', plannedKey: 'shopping_days_planned', actualKey: 'shopping_days_actual', label: 'ימי קניות' },
      { key: 'supervision', plannedKey: 'supervision_days_planned', actualKey: 'supervision_days_actual', label: 'ימי פיקוח' },
      { key: 'installation', plannedKey: 'installation_days_planned', actualKey: 'installation_days_actual', label: 'ימי התקנות' },
    ];

    const alerts = [];
    for (const dt of dayTypes) {
      const planned = data[dt.plannedKey] || 0;
      const actual = data[dt.actualKey] || 0;
      const oldActual = old_data[dt.actualKey] || 0;
      if (planned <= 0) continue;

      const threshold = planned - 1;
      // Fire if we just crossed the threshold (old was below, new is at or above)
      if (actual >= threshold && oldActual < threshold) {
        alerts.push(dt);
      }
    }

    if (alerts.length === 0) return Response.json({ skipped: 'no threshold crossed' });

    // Get client
    let clientName = 'הלקוח/ה';
    let clientEmail = null;
    if (data.client_id) {
      const clients = await base44.asServiceRole.entities.Client.filter({ id: data.client_id });
      if (clients[0]) {
        clientName = clients[0].name || clientName;
        clientEmail = clients[0].email;
      }
    }

    for (const alert of alerts) {
      const actual = data[alert.actualKey] || 0;
      const planned = data[alert.plannedKey] || 0;
      const remaining = Math.max(0, planned - actual);

      // Create task for Michal
      await base44.asServiceRole.entities.Task.create({
        project_id: projectId,
        client_id: data.client_id || undefined,
        title: `⚠️ ${alert.label} — נותר ${remaining} יום מתוך ${planned}`,
        description: `${clientName} — ${data.name || 'פרויקט'}\nנוצלו ${actual} מתוך ${planned} ${alert.label}.`,
        type: 'manual',
        status: 'open',
        priority: remaining === 0 ? 'urgent' : 'high',
        due_date: new Date().toISOString().split('T')[0],
        auto_generated: true,
      });

      // Notify client via email
      if (clientEmail) {
        const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
        if (BREVO_API_KEY) {
          await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sender: { name: 'סטודיו מיכל וולברגר', email: 'michalwol123@gmail.com' },
              to: [{ email: clientEmail }],
              subject: `עדכון: ${alert.label} — נותר ${remaining} יום`,
              htmlContent: `<div dir="rtl" style="font-family:Arial,sans-serif;padding:20px;max-width:500px;">
                <h2 style="color:#8B7355;">עדכון ${alert.label}</h2>
                <p>שלום ${clientName},</p>
                <p>עדכון לגבי הפרויקט <strong>${data.name || ''}</strong>:</p>
                <p style="font-size:18px;font-weight:bold;color:${remaining === 0 ? '#ef4444' : '#f97316'};">
                  נוצלו ${actual} מתוך ${planned} ${alert.label}${remaining === 0 ? ' — המכסה מוצתה' : ` — נותר ${remaining} יום`}.
                </p>
                <p style="color:#666;font-size:13px;">במידה ויש צורך בימים נוספים, נשמח לעדכן.</p>
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
          content: `⚠️ התראת מכסה: ${alert.label} — ${actual}/${planned}`,
          sent_by: 'system',
          status: 'sent',
          channel: 'base44_native',
        });
      }
    }

    return Response.json({ success: true, alerts: alerts.map(a => a.label) });
  } catch (error) {
    console.error('autoDaysQuotaAlert error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});