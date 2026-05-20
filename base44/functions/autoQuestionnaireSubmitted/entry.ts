// Automation: When a questionnaire is submitted with client_id,
// update the client and project records with extracted data from responses.
// Handles both short (type='short') and detailed (type='detailed') questionnaires.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SPACE_TO_PROPERTY = {
  up_to_80: 'apartment',
  up_to_160: 'apartment',
  up_to_240: 'house',
  public_space: 'commercial',
  specific_room: 'apartment',
};

const STYLE_MAP = {
  modern: 'מודרני',
  country: 'כפרי',
  industrial: 'תעשייתי',
  eclectic: 'אקלקטי',
  minimalist: 'מינימליסטי',
  elegant: 'אלגנטי',
  colorful: 'צבעוני',
  dont_know: 'לא יודעים',
};

const LIVING_ROOM_ITEMS_MAP = {
  'טלוויזיה': { category: 'appliances', title: 'טלוויזיה' },
  'ספריה': { category: 'furniture', title: 'ספריה' },
  'שולחן קפה': { category: 'furniture', title: 'שולחן קפה' },
  'שטיח': { category: 'textile', title: 'שטיח' },
  'וילונות': { category: 'textile', title: 'וילונות' },
  'קולנוע ביתי': { category: 'appliances', title: 'קולנוע ביתי' },
  'קמין': { category: 'accessories', title: 'קמין' },
  'פסנתר': { category: 'furniture', title: 'פסנתר' },
  'אוספים/ויטרינות': { category: 'furniture', title: 'ויטרינה לאוספים' },
  'מקומות ישיבה נוספים': { category: 'furniture', title: 'מקומות ישיבה נוספים' },
};

const SEATING_MAP = {
  sofa_3_2: 'ספה 3+2',
  l_shape: 'ספה בצורת ר',
  long_armchairs: 'ספה ארוכה וכורסאות',
};

const DINING_ITEMS_MAP = {
  round_table: { category: 'furniture', title: 'שולחן אוכל עגול/אליפטי' },
  rectangular_table: { category: 'furniture', title: 'שולחן אוכל מלבני' },
  library_vitrine: { category: 'furniture', title: 'ספריה/ויטרינה לפינת אוכל' },
  candle_corner: { category: 'accessories', title: 'פינת הדלקת נרות' },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, event } = await req.json();

    if (!data || event?.type !== 'create') {
      return Response.json({ skipped: true, reason: 'not a create event' });
    }

    if (data.status !== 'submitted' || !data.client_id) {
      return Response.json({ skipped: true, reason: 'not a submitted questionnaire with client_id' });
    }

    const clientId = data.client_id;
    let responses = {};
    try {
      responses = JSON.parse(data.responses || '{}');
    } catch (_) {
      return Response.json({ skipped: true, reason: 'invalid responses JSON' });
    }

    const clients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
    const client = clients[0];
    if (!client) return Response.json({ skipped: true, reason: 'client not found' });

    // ─── SHORT QUESTIONNAIRE ───
    if (data.type === 'short') {
      const clientUpdate = {};

      if (responses.design_style) {
        clientUpdate.design_style = STYLE_MAP[responses.design_style] || responses.design_style;
      }
      if (responses.space_type && SPACE_TO_PROPERTY[responses.space_type]) {
        clientUpdate.property_type = SPACE_TO_PROPERTY[responses.space_type];
      }
      if (responses.budget) {
        const nums = responses.budget.replace(/,/g, '').match(/\d+/g);
        if (nums && nums.length > 0) {
          const values = nums.map(Number);
          clientUpdate.estimated_budget = values.length >= 2
            ? Math.round((values[0] + values[1]) / 2)
            : values[0];
        }
      }

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
        const existingNotes = client.notes || '';
        const separator = existingNotes ? '\n\n' : '';
        clientUpdate.notes = existingNotes + separator + '📋 שאלון קצר:\n' + summaryParts.join('\n');
      }

      if (Object.keys(clientUpdate).length > 0) {
        await base44.asServiceRole.entities.Client.update(clientId, clientUpdate);
      }

      await base44.asServiceRole.entities.Communication.create({
        client_id: clientId,
        type: 'note',
        direction: 'inbound',
        content: `הלקוח/ה מילא/ה שאלון קצר — הנתונים עודכנו בכרטיס הלקוח.`,
        sent_by: 'client',
        status: 'sent',
        channel: 'base44_native',
      });

      return Response.json({ success: true, type: 'short', updated_fields: Object.keys(clientUpdate) });
    }

    // ─── DETAILED QUESTIONNAIRE ───
    if (data.type === 'detailed') {
      const projectId = data.project_id;
      const clientUpdate = {};
      const projectUpdate = {};
      const designItemsToCreate = [];

      // 1. סגנון עיצובי → לקוח
      if (responses.design_style) {
        clientUpdate.design_style = STYLE_MAP[responses.design_style] || responses.design_style;
      }

      // 2. מה ישדר הבית → מטרות הפרויקט
      if (responses.home_feeling) {
        projectUpdate.project_goals = responses.home_feeling;
      }

      // 3. חללים — סלון + פינת אוכל
      const spacesList = [];
      if (responses.living_items?.length > 0 || responses.seating_type) spacesList.push('סלון');
      if (responses.dining_items?.length > 0 || responses.table_seats) spacesList.push('פינת אוכל');
      if (spacesList.length > 0) {
        projectUpdate.spaces = spacesList.join(', ');
      }

      // 4. הערות פרויקט — צבעים, תושבים, פרטים
      const notesParts = [];
      if (responses.residents) notesParts.push(`תושבי הבית: ${responses.residents}`);
      if (responses.birth_dates) notesParts.push(`תאריכי לידה: ${responses.birth_dates}`);
      if (responses.preferred_colors) notesParts.push(`צבעים מועדפים: ${responses.preferred_colors}`);
      if (responses.disliked_colors) notesParts.push(`צבעים לא אוהבים: ${responses.disliked_colors}`);
      if (responses.living_notes) notesParts.push(`הערות סלון: ${responses.living_notes}`);
      if (responses.existing_furniture) notesParts.push(`רהיטים קיימים: ${responses.existing_furniture}`);
      if (responses.dining_notes) notesParts.push(`הערות פינת אוכל: ${responses.dining_notes}`);
      if (responses.hosting_style) notesParts.push(`סגנון אירוח: ${responses.hosting_style}`);

      if (notesParts.length > 0) {
        projectUpdate.notes = '📋 שאלון מפורט:\n' + notesParts.join('\n');
      }

      // 5. פריטי עיצוב — סלון
      if (responses.living_items?.length > 0) {
        for (const item of responses.living_items) {
          const mapped = LIVING_ROOM_ITEMS_MAP[item];
          if (mapped) {
            const desc = [];
            if (item === 'טלוויזיה' && responses.tv_size) desc.push(`גודל: ${responses.tv_size}`);
            if (item === 'וילונות' && responses.accent_wall) desc.push(`קיר כח: ${responses.accent_wall}`);
            designItemsToCreate.push({
              project_id: projectId,
              room: 'סלון',
              category: mapped.category,
              title: mapped.title,
              description: desc.join(', ') || undefined,
              status: 'planned',
              stage: 8,
            });
          }
        }
      }

      // ספה
      if (responses.seating_type) {
        const seatLabel = SEATING_MAP[responses.seating_type] || responses.seating_other || responses.seating_type;
        designItemsToCreate.push({
          project_id: projectId,
          room: 'סלון',
          category: 'furniture',
          title: seatLabel,
          status: 'planned',
          stage: 8,
        });
      }

      // 6. פריטי עיצוב — פינת אוכל
      if (responses.dining_items?.length > 0) {
        for (const key of responses.dining_items) {
          const mapped = DINING_ITEMS_MAP[key];
          if (mapped) {
            const desc = [];
            if ((key === 'round_table' || key === 'rectangular_table') && responses.table_seats) {
              desc.push(`מקומות: ${responses.table_seats}`);
            }
            designItemsToCreate.push({
              project_id: projectId,
              room: 'פינת אוכל',
              category: mapped.category,
              title: mapped.title,
              description: desc.join(', ') || undefined,
              status: 'planned',
              stage: 8,
            });
          }
        }
      }

      // Apply updates
      if (Object.keys(clientUpdate).length > 0) {
        await base44.asServiceRole.entities.Client.update(clientId, clientUpdate);
      }
      if (projectId && Object.keys(projectUpdate).length > 0) {
        await base44.asServiceRole.entities.Project.update(projectId, projectUpdate);
      }
      if (projectId && designItemsToCreate.length > 0) {
        await base44.asServiceRole.entities.DesignItem.bulkCreate(designItemsToCreate);
      }

      await base44.asServiceRole.entities.Communication.create({
        client_id: clientId,
        project_id: projectId || undefined,
        type: 'note',
        direction: 'inbound',
        content: `הלקוח/ה מילא/ה שאלון מפורט — הנתונים עודכנו בפרויקט${designItemsToCreate.length > 0 ? ` ונוצרו ${designItemsToCreate.length} פריטי עיצוב` : ''}.`,
        sent_by: 'client',
        status: 'sent',
        channel: 'base44_native',
      });

      return Response.json({
        success: true,
        type: 'detailed',
        client_updated: Object.keys(clientUpdate),
        project_updated: Object.keys(projectUpdate),
        design_items_created: designItemsToCreate.length,
      });
    }

    return Response.json({ skipped: true, reason: `unknown type: ${data.type}` });
  } catch (error) {
    console.error('autoQuestionnaireSubmitted error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});