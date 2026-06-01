import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Entity automation: ProjectSupplier update
// When status changes to "approved" → update/create BudgetItem by category

Deno.serve(async (req) => {
  try {
    const clonedReq = req.clone();
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await clonedReq.json();

    if (!data) return Response.json({ skipped: 'no data' });

    // Only act when status changed to approved
    const statusChanged = !old_data || old_data.status !== data.status;
    if (!statusChanged) return Response.json({ skipped: 'status not changed' });

    const projectId = data.project_id;
    const category = data.category || 'ספקים כללי';

    if (!projectId) return Response.json({ skipped: 'no project_id' });

    // Sum all approved ProjectSuppliers for this project + category
    const allPS = await base44.asServiceRole.entities.ProjectSupplier.filter({ project_id: projectId });
    const totalAgreed = allPS
      .filter(ps => ps.category === category && ps.status === 'approved')
      .reduce((sum, ps) => sum + (ps.agreed_amount || ps.quoted_amount || 0), 0);

    // Find matching BudgetItem
    const existingItems = await base44.asServiceRole.entities.BudgetItem.filter({ project_id: projectId });
    const matchingItem = existingItems.find(bi => bi.category === category);

    if (matchingItem) {
      await base44.asServiceRole.entities.BudgetItem.update(matchingItem.id, {
        actual_amount: totalAgreed,
      });
    } else if (totalAgreed > 0) {
      await base44.asServiceRole.entities.BudgetItem.create({
        project_id: projectId,
        category,
        planned_amount: totalAgreed,
        actual_amount: totalAgreed,
        notes: 'נוצר אוטומטית מספקי פרויקט',
      });
    }

    return Response.json({ success: true, action: matchingItem ? 'updated' : 'created', totalAgreed });
  } catch (error) {
    console.error('autoProjectSupplierBudget error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});