import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Entity automation: PurchaseOrder update
// When status changes to 'confirmed' or 'delivered' → create/update BudgetItem

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    if (!data) return Response.json({ skipped: 'no data' });

    const newStatus = data.status;
    const oldStatus = old_data?.status;

    // Only fire when status CHANGED to confirmed or delivered
    if (!['confirmed', 'delivered'].includes(newStatus)) {
      return Response.json({ skipped: 'not confirmed/delivered' });
    }
    if (newStatus === oldStatus) {
      return Response.json({ skipped: 'status unchanged' });
    }

    const poId = event.entity_id;
    const projectId = data.project_id;
    const category = data.category || 'רכש כללי';
    const amount = data.amount || 0;

    if (!projectId || amount <= 0) {
      return Response.json({ skipped: 'no project or amount' });
    }

    // Check if BudgetItem already exists for this PO (by matching notes containing PO ID)
    const existingItems = await base44.asServiceRole.entities.BudgetItem.filter({ project_id: projectId });
    const matchingItem = existingItems.find(bi => bi.notes && bi.notes.includes(`PO:${poId}`));

    if (matchingItem) {
      // Update existing
      await base44.asServiceRole.entities.BudgetItem.update(matchingItem.id, {
        actual_amount: amount,
        category,
        supplier_id: data.supplier_id || undefined,
      });
    } else {
      // Create new
      await base44.asServiceRole.entities.BudgetItem.create({
        project_id: projectId,
        category,
        planned_amount: amount,
        actual_amount: amount,
        supplier_id: data.supplier_id || undefined,
        notes: `PO:${poId} — ${data.description || ''}`,
      });
    }

    return Response.json({ success: true, action: matchingItem ? 'updated' : 'created' });
  } catch (error) {
    console.error('autoPurchaseOrderBudget error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});