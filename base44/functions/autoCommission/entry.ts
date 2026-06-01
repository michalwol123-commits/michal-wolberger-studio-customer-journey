import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data } = body;

    const newStatus = data?.status;
    const oldStatus = old_data?.status;

    // Only trigger when status changes TO approved or completed
    if (!['approved', 'completed'].includes(newStatus) || newStatus === oldStatus) {
      return Response.json({ skipped: true });
    }

    const projectSupplierId = event?.entity_id;
    const supplierId = data?.supplier_id;
    const projectId = data?.project_id;
    const amount = data?.agreed_amount || data?.quoted_amount || 0;

    if (!supplierId || !projectId || !amount) {
      return Response.json({ skipped: 'missing fields' });
    }

    // Get supplier commission rate
    const suppliers = await base44.asServiceRole.entities.Supplier.filter({ id: supplierId });
    const supplier = suppliers?.[0];
    const rate = supplier?.commission_rate || 0;

    if (!rate || rate <= 0) {
      return Response.json({ skipped: 'no commission rate' });
    }

    // Idempotency — don't create duplicate commission for same project supplier
    const existing = await base44.asServiceRole.entities.Commission.filter({ project_supplier_id: projectSupplierId });
    if (existing?.length > 0) {
      // Update existing commission if amount changed
      const existingComm = existing[0];
      const newCommissionAmount = Math.round(amount * rate) / 100;
      if (existingComm.purchase_amount !== amount || existingComm.commission_rate !== rate) {
        await base44.asServiceRole.entities.Commission.update(existingComm.id, {
          commission_rate: rate,
          purchase_amount: amount,
          commission_amount: newCommissionAmount,
        });
        return Response.json({ updated: true, commissionAmount: newCommissionAmount });
      }
      return Response.json({ skipped: 'already exists' });
    }

    const commissionAmount = Math.round(amount * rate) / 100;

    await base44.asServiceRole.entities.Commission.create({
      supplier_id: supplierId,
      project_id: projectId,
      project_supplier_id: projectSupplierId,
      commission_rate: rate,
      purchase_amount: amount,
      commission_amount: commissionAmount,
      status: 'pending',
    });

    return Response.json({ ok: true, commissionAmount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});