import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, project_supplier_id, extract_only } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'Missing file_url' }, { status: 400 });
    }

    // Extended extraction prompt — always extract all fields
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `אתה מנתח הצעות מחיר ומסמכים פיננסיים של ספקים בעולם עיצוב פנים ושיפוצים.
חלץ מהמסמך המצורף את הפרטים הבאים:

1. **total_amount** — הסכום הסופי לתשלום (סה"כ כולל מע"מ). אם אין מע"מ, החזר את הסכום הכולל. החזר רק את המספר ללא סימן מטבע. אם לא ניתן לחלץ, החזר null.

2. **supplier_name** — שם העסק / הספק שהוציא את ההצעה. חפש בכותרת, לוגו, או חתימה. אם לא נמצא, החזר null.

3. **supplier_phone** — מספר טלפון של הספק (אם מופיע). החזר null אם לא נמצא.

4. **budget_category** — הקטגוריה התקציבית המתאימה ביותר מהרשימה הבאה בלבד:
מטבח, נגרות, חשמל, אינסטלציה, ריצוף, צבע, מזגנים, תאורה, טקסטיל, זגגות, נירוסטה, קבלן, אחר
בחר קטגוריה אחת בלבד על פי תוכן ההצעה. אם לא ברור, החזר null.

5. **supplier_category** — קטגוריית הספק (לא תקציבית) מהרשימה הבאה בלבד:
carpenter, electrician, plumber, painter, ac, kitchen, flooring, stainless, glass, textile, lighting, contractor, other
בחר ערך אחד בלבד על פי סוג הספק. אם לא ברור, החזר "other".`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          total_amount: { type: "number", description: "סכום סופי לתשלום כולל מע״מ" },
          supplier_name: { type: "string", description: "שם הספק/העסק" },
          supplier_phone: { type: "string", description: "טלפון הספק" },
          budget_category: { type: "string", description: "קטגוריה תקציבית" },
          supplier_category: { type: "string", description: "קטגוריית ספק: carpenter/electrician/plumber/painter/ac/kitchen/flooring/stainless/glass/textile/lighting/contractor/other" }
        }
      }
    });

    const amount = result?.total_amount;
    const supplierName = result?.supplier_name || null;
    const supplierPhone = result?.supplier_phone || null;
    const budgetCategory = result?.budget_category || null;
    const supplierCategory = result?.supplier_category || 'other';

    // Mode 1: extract_only — return data without updating DB
    if (extract_only) {
      return Response.json({
        success: true,
        extracted: {
          amount: amount > 0 ? amount : null,
          supplier_name: supplierName,
          supplier_phone: supplierPhone,
          budget_category: budgetCategory,
          supplier_category: supplierCategory,
        }
      });
    }

    // Mode 2: update existing ProjectSupplier record (original behavior)
    if (!project_supplier_id) {
      return Response.json({ error: 'Missing project_supplier_id' }, { status: 400 });
    }

    if (amount && amount > 0) {
      const ps = await base44.entities.ProjectSupplier.filter({ id: project_supplier_id });
      const current = ps?.[0];

      let history = [];
      if (current?.quote_history) {
        try { history = JSON.parse(current.quote_history); } catch (_) { history = []; }
      }

      history.push({
        file_url,
        amount,
        date: new Date().toISOString().split('T')[0]
      });

      await base44.entities.ProjectSupplier.update(project_supplier_id, {
        quoted_amount: amount,
        attachment_url: file_url,
        quote_history: JSON.stringify(history),
        status: current?.status === 'pending' ? 'quoted' : current?.status
      });

      return Response.json({ success: true, amount, history_count: history.length });
    }

    return Response.json({ success: false, message: 'Could not extract amount from document' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});