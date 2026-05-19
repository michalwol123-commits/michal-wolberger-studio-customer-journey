// Automation: When a short questionnaire is submitted with client_id,
// update the client record with extracted data from responses.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SPACE_TO_PROPERTY = {
  up_to_80: 'apartment',
  up_to_160: 'apartment',
  up_to_240: 'house',
  public_space: 'commercial',
  specific_room: 'apartment',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, event } = await req.json();

    if (!data || event?.type !== 'create') {
      return Response.json({ skipped: true, reason: 'not a create event' });
    }

    // Only process submitted short questionnaires with a client_id
    if (data.type !== 'short' || data.status !== 'submitted' || !data.client_id) {
      return Response.json({ skipped: true, reason: 'not a submitted short questionnaire with client_id' });
    }

    const clientId = data.client_id;

    // Parse responses
    let responses = {};
    try {
      responses = JSON.parse(data.responses || '{}');
    } catch (_) {
      return Response.json({ skipped: true, reason: 'invalid responses JSON' });
    }

    // Build client update
    const clientUpdate = {};

    // Map design_style
    if (responses.design_style) {
      const styleMap = { modern: 'מודרני', country: 'כפרי', industrial: 'תעשייתי', eclectic: 'אקלקטי', minimalist: 'מינימליסטי' };
      clientUpdate.design_style = styleMap[responses.design_style] || responses.design_style;
    }

    // Map property_type from space_type
    if (responses.space_type && SPACE_TO_PROPERTY[responses.space_type]) {
      clientUpdate.property_type = SPACE_TO_PROPERTY[responses.space_type];
    }

    // Extract budget estimate
    if (responses.budget) {
      // Try to extract a number from the budget string
      const nums = responses.budget.replace(/,/g, '').match(/\d+/g);
      if (nums && nums.length > 0) {
        // If range, take average; if single number, use it
        const values = nums.map(Number);
        clientUpdate.estimated_budget = values.length >= 2
          ? Math.round((values[0] + values[1]) / 2)
          : values[0];
      }
    }

    // Build summary for notes
    const summaryParts = [];
    if (responses.household) summaryParts.push(`נפשות בבית: ${responses.household}`);
    if (responses.property_size_age) summaryParts.push(`שטח/גיל נכס: ${responses.property_size_age}`);
    if (responses.why_renovate) summaryParts.push(`סיבת שיפוץ: ${responses.why_renovate}`);
    if (responses.expectations) summaryParts.push(`ציפיות: ${responses.expectations}`);
    if (responses.expectations_other) summaryParts.push(`ציפיות (אחר): ${responses.expectations_other}`);
    if (responses.style_philosophy) summaryParts.push(`גישה עיצובית: ${responses.style_philosophy}`);
    if (responses.gift) summaryParts.push(`שי: ${responses.gift}`);
    if (responses.birth_date) summaryParts.push(`ת. לידה: ${responses.birth_date}`);
    if (responses.wedding_date) summaryParts.push(`ת. נישואין: ${responses.wedding_date}`);

    if (summaryParts.length > 0) {
      // Get existing notes to append
      const clients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
      const existingNotes = clients[0]?.notes || '';
      const separator = existingNotes ? '\n\n' : '';
      clientUpdate.notes = existingNotes + separator + '📋 שאלון קצר:\n' + summaryParts.join('\n');
    }

    // Update client if we have anything
    if (Object.keys(clientUpdate).length > 0) {
      await base44.asServiceRole.entities.Client.update(clientId, clientUpdate);
      console.log('Client updated from questionnaire:', clientId, Object.keys(clientUpdate));
    }

    // Log communication
    await base44.asServiceRole.entities.Communication.create({
      client_id: clientId,
      type: 'note',
      direction: 'inbound',
      content: `הלקוח/ה מילא/ה שאלון קצר — הנתונים עודכנו בכרטיס הלקוח.`,
      sent_by: 'client',
      status: 'sent',
      channel: 'base44_native',
    });

    return Response.json({ success: true, updated_fields: Object.keys(clientUpdate) });
  } catch (error) {
    console.error('autoQuestionnaireSubmitted error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});