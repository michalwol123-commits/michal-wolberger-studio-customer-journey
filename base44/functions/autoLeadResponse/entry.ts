// Automation A — Auto Lead Response
// Trigger: Client record_created with status=lead
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, event } = await req.json();

    if (!data || data.status !== 'lead') {
      return Response.json({ skipped: true, reason: 'not a lead' });
    }

    const clientId = event.entity_id;
    const clientName = data.name || 'לקוח חדש';

    // jitter — מפזר ריצות מקביליות
    await new Promise(r => setTimeout(r, Math.floor(Math.random() * 400)));

    // קריאה מה-DB (לא מה-snapshot של האירוע)
    const [currentClient] = await base44.asServiceRole.entities.Client.filter({ id: clientId });
    if (!currentClient) {
      return Response.json({ skipped: true, reason: 'client not found' });
    }
    if (currentClient.first_response_at) {
      return Response.json({ skipped: true, reason: 'already processed' });
    }

    // כותבים token ייחודי כ-lock
    const myToken = new Date().toISOString();
    await base44.asServiceRole.entities.Client.update(clientId, {
      first_response_at: myToken,
    });

    // ממתינים לריצה מקבילה
    await new Promise(r => setTimeout(r, 300));

    // בודקים שה-token שלנו עדיין שם
    const [lockedClient] = await base44.asServiceRole.entities.Client.filter({ id: clientId });
    if (!lockedClient || lockedClient.first_response_at !== myToken) {
      return Response.json({ skipped: true, reason: 'race condition — parallel run handled this' });
    }

    // יוצרים את כל הרשומות
    await base44.asServiceRole.entities.Task.create({
      title: `פנייה ראשונית — ${clientName}`,
      description: `ליד חדש נכנס. יש ליצור קשר תוך 30 דקות.`,
      type: 'followup',
      priority: 'high',
      status: 'open',
      client_id: clientId,
      due_date: new Date().toISOString().split('T')[0],
      auto_generated: true,
    });

    await base44.asServiceRole.entities.Communication.create({
      client_id: clientId,
      type: 'whatsapp',
      direction: 'outbound',
      content: `שלום ${clientName}, תודה על הפנייה לסטודיו מיכל וולברגר! קיבלנו את הפרטים שלך ונחזור אליך בהקדם.`,
      sent_by: 'system',
      status: 'pending',
      channel: 'base44_native',
    });

    await base44.asServiceRole.entities.Meeting.create({
      client_id: clientId,
      type: 'intro',
      status: 'scheduled',
      duration: 45,
    });

    return Response.json({ success: true, automation: 'A', client: clientName });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});