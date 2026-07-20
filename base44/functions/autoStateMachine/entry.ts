// Automation I — State Machine Enforcement
// Trigger: record_updated on Client, Project, Quote, Task, Payment
// Uses last_valid_status field to detect and break rollback loops
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const TRANSITIONS = {
  Client: {
    lead: ['qualified', 'proposal_presented', 'proposal_sent', 'active_client', 'completed_client', 'archived'],
    qualified: ['lead', 'proposal_presented', 'proposal_sent', 'active_client', 'completed_client', 'archived'],
    proposal_presented: ['lead', 'qualified', 'proposal_sent', 'active_client', 'completed_client', 'archived'],
    proposal_sent: ['lead', 'qualified', 'proposal_presented', 'active_client', 'completed_client', 'archived'],
    active_client: ['lead', 'qualified', 'proposal_presented', 'proposal_sent', 'completed_client', 'archived'],
    completed_client: ['lead', 'qualified', 'proposal_presented', 'proposal_sent', 'active_client', 'archived'],
    archived: ['lead', 'qualified', 'proposal_presented', 'proposal_sent', 'active_client', 'completed_client'],
  },
  Project: {
    active: ['on_hold', 'completed', 'cancelled'],
    on_hold: ['active', 'cancelled'],
    completed: [],
    cancelled: [],
  },
  Quote: {
    draft: ['sent', 'sent_for_signature', 'contract_sent_for_signature', 'approved', 'rejected', 'expired'],
    viewed: ['draft', 'sent', 'sent_for_signature', 'contract_sent_for_signature', 'approved', 'rejected', 'expired'],
    sent: ['draft', 'sent_for_signature', 'contract_sent_for_signature', 'approved', 'rejected', 'expired'],
    sent_for_signature: ['draft', 'sent', 'contract_sent_for_signature', 'approved', 'rejected', 'expired'],
    contract_sent_for_signature: ['draft', 'sent', 'sent_for_signature', 'approved', 'rejected', 'expired'],
    approved: ['draft', 'sent', 'sent_for_signature', 'contract_sent_for_signature', 'rejected', 'expired'],
    rejected: ['draft', 'sent', 'sent_for_signature', 'contract_sent_for_signature', 'approved', 'expired'],
    expired: ['draft', 'sent', 'sent_for_signature', 'contract_sent_for_signature', 'approved', 'rejected'],
  },
  Task: {
    open: ['in_progress', 'done', 'cancelled'],
    in_progress: ['done', 'open', 'cancelled'],
    done: ['open'],
    cancelled: ['open'],
  },
  Payment: {
    pending: ['partial', 'paid', 'overdue'],
    partial: ['paid', 'overdue'],
    paid: [],
    overdue: ['partial', 'paid', 'pending'],
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, old_data, event } = await req.json();

    if (!data || !old_data || !event) return Response.json({ skipped: true });

    const entityName = event.entity_name;
    const entityId = event.entity_id;
    const oldStatus = old_data.status;
    const newStatus = data.status;

    // No status change — skip
    if (oldStatus === newStatus) return Response.json({ skipped: true, reason: 'status unchanged' });

    // If old status is missing (new record or data inconsistency) — allow freely
    if (!oldStatus) return Response.json({ skipped: true, reason: 'no old status, allowing' });

    // ROLLBACK DETECTION: if the new status matches last_valid_status,
    // this is our own rollback update — stop the loop
    if (data.last_valid_status && newStatus === data.last_valid_status) {
      return Response.json({ skipped: true, reason: 'rollback detected, breaking loop' });
    }

    const entityTransitions = TRANSITIONS[entityName];
    if (!entityTransitions) return Response.json({ skipped: true, reason: 'no rules for entity' });

    const allowed = entityTransitions[oldStatus];
    // If old status is not recognized in transition table — allow freely instead of blocking
    if (!allowed) return Response.json({ skipped: true, reason: 'unknown old status, allowing' });

    if (allowed.includes(newStatus)) {
      // VALID TRANSITION — update last_valid_status
      const updatePayload = { last_valid_status: newStatus };

      // Auto-fill timestamp fields on valid Client transitions
      if (entityName === 'Client') {
        const timestampMap = {
          qualified: { qualified_at: new Date().toISOString() },
          proposal_presented: { proposal_presented_at: new Date().toISOString() },
          proposal_sent: { proposal_sent_at: new Date().toISOString() },
          completed_client: { completed_at: new Date().toISOString() },
        };
        const tsUpdate = timestampMap[newStatus];
        if (tsUpdate) Object.assign(updatePayload, tsUpdate);
      }

      // Auto-fill end_date_actual on Project completion
      if (entityName === 'Project' && newStatus === 'completed') {
        updatePayload.end_date_actual = new Date().toISOString().split('T')[0];
      }

      const entityApi = base44.asServiceRole.entities[entityName];
      await entityApi.update(entityId, updatePayload);

      return Response.json({ valid: true, from: oldStatus, to: newStatus });
    }

    // INVALID TRANSITION — rollback using last_valid_status (or oldStatus as fallback)
    const rollbackTo = old_data.last_valid_status || oldStatus;
    const entityApi = base44.asServiceRole.entities[entityName];

    await entityApi.update(entityId, {
      status: rollbackTo,
      last_valid_status: rollbackTo,
    });

    // Log error
    const clientId = data.client_id || (entityName === 'Client' ? entityId : '');
    await base44.asServiceRole.entities.Communication.create({
      client_id: clientId,
      type: 'system_error',
      direction: 'outbound',
      content: `🚫 מעבר סטטוס לא מורשה ב-${entityName}: "${oldStatus}" → "${newStatus}". בוצע rollback ל-"${rollbackTo}".`,
      sent_by: 'system',
      status: 'sent',
      channel: 'base44_native',
      error_detail: `Invalid transition: ${entityName}#${entityId} ${oldStatus} → ${newStatus}. Rolled back to ${rollbackTo}.`,
    });

    return Response.json({
      valid: false,
      rolledBack: true,
      entity: entityName,
      from: oldStatus,
      to: newStatus,
      rolledBackTo: rollbackTo,
    });
  } catch (error) {
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.Communication.create({
        client_id: '',
        type: 'system_error',
        direction: 'outbound',
        content: `Automation I (State Machine) failed: ${error.message}`,
        sent_by: 'system',
        status: 'failed',
        channel: 'base44_native',
        error_detail: error.message,
        retry_count: 0,
      });
    } catch (_) { /* silent */ }
    return Response.json({ error: error.message }, { status: 500 });
  }
});