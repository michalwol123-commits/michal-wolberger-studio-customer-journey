import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, project_supplier_id } = await req.json();

    if (!file_url || !project_supplier_id) {
      return Response.json({ error: 'Missing file_url or project_supplier_id' }, { status: 400 });
    }

    // Use LLM to extract total amount from the uploaded document
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `אתה מנתח הצעות מחיר ומסמכים פיננסיים.
חלץ מהמסמך המצורף את הסכום הסופי לתשלום (סה"כ כולל מע"מ).
אם אין מע"מ, החזר את הסכום הכולל.
אם לא ניתן לחלץ סכום, החזר null.
חשוב: החזר רק את המספר ללא סימן מטבע.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          total_amount: {
            type: "number",
            description: "סכום סופי לתשלום כולל מע״מ"
          }
        }
      }
    });

    const amount = result?.total_amount;

    if (amount && amount > 0) {
      // Get current ProjectSupplier to read existing history
      const ps = await base44.entities.ProjectSupplier.filter({ id: project_supplier_id });
      const current = ps?.[0];
      
      // Parse existing history
      let history = [];
      if (current?.quote_history) {
        try { history = JSON.parse(current.quote_history); } catch (_) { history = []; }
      }

      // Add new entry
      history.push({
        file_url,
        amount,
        date: new Date().toISOString().split('T')[0]
      });

      // Update ProjectSupplier with new quoted_amount and history
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