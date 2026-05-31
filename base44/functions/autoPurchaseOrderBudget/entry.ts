import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Entity automation: PurchaseOrder update/create
// When status changes → recalculate actual_amount on matching BudgetItem by category

Deno.serve(async (req) => {
  try {
    const clonedReq = req.clone();
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await clonedReq.json();

    if (!data) return Response.json({ skipped: 'no data' });

    const projectId = data.project_id;
    const category = data.category || 'רכש כללי';
    const amount = data.amount || 0;

    if (!projectId) {
      return Response.json({ skipped: 'no project_id' });
    }

    // חפש BudgetItem קיים לפי project + category
    const existingItems = await base44.asServiceRole.entities.BudgetItem.filter({ project_id: projectId });
    const matchingItem = existingItems.find(bi => bi.category === category);

    // חשב סכום כל ה-POs המאושרים/מסופקים לאותה קטגוריה בפרויקט זה
    const allPOs = await base44.asServiceRole.entities.PurchaseOrder.filter({ project_id: projectId });
    const totalActual = allPOs
      .filter(po => po.category === category && ['confirmed', 'delivered'].includes(po.status))
      .reduce((sum, po) => sum + (po.amount || 0), 0);

    if (matchingItem) {
      // עדכן actual_amount בפריט הקיים
      await base44.asServiceRole.entities.BudgetItem.update(matchingItem.id, {
        actual_amount: totalActual,
      });
    } else {
      // קטגוריה לא תוכננה מראש — צור פריט חדש
      await base44.asServiceRole.entities.BudgetItem.create({
        project_id: projectId,
        category,
        planned_amount: amount,
        actual_amount: totalActual,
        supplier_id: data.supplier_id || undefined,
        notes: 'נוצר אוטומטית מהזמנות ספקים',
      });
    }

    return Response.json({ success: true, action: matchingItem ? 'updated' : 'created', totalActual });
  } catch (error) {
    console.error('autoPurchaseOrderBudget error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});