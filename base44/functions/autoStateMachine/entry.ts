// Automation I — State Machine Enforcement
// Trigger: record_updated on Client, Project, Quote, Task, Payment
// Condition: Invalid status transition
// Action: Rollback + Communication (system_error) + notification

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Valid transitions per entity
const TRANSITIONS = {
  Client: {
    lead: ['qualified', 'archived'],
    qualified: ['proposal_sent', 'archived'],
    proposal_sent: ['proposal_approved', 'qualified', 'archived'],
    proposal_approved: ['active_client', 'archived'],
    active_client: ['completed_client', 'archived'],
    completed_client: ['active_client', 'archived'],
    archived: ['lead'],
  },
  Project: {
    active: ['on_hold', 'completed', 'cancelled'],
    on_hold: ['active', 'cancelled'],
    completed: [], // terminal
    cancelled: ['active'],
  },
  Quote: {
    draft: ['sent'],
    sent: ['viewed', 'expired'],
    viewed: ['approved', 'rejected', 'expired'],
    approved: [], // terminal
    rejected: ['draft'],
    expired: ['draft'],
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
    paid: [], // terminal
    overdue: ['partial', 'paid', 'pending'],
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, old_data, event } = await req.json();

    if (!data || !old_data || !event) return Response.json({ skipped: true });
    if (data.status === old_data.status) return Response.json({ skipped: true, reason: 'status unchanged' });

    const entityName = event.entity_name;
    const entityId = event.entity_id;
    const oldStatus = old_data.status;
    const newStatus = data.status;

    const entityTransitions = TRANSITIONS[entityName];
    if (!entityTransitions) return Response.json({ skipped: true, reason: 'no rules for entity' });

    const allowed = entityTransitions[oldStatus];
    if (!allowed) return Response.json({ skipped: true, reason: 'unknown old status' });

    if (allowed.includes(newStatus)) {
      // Auto-fill timestamp fields on valid Client transitions
      if (entityName === 'Client') {
        const timestampMap = {
          qualified: { qualified_at: new Date().toISOString() },
          proposal_sent: { proposal_sent_at: new Date().toISOString() },
          active_client: {},
          completed_client: { completed_at: new Date().toISOString() },
        };
        const tsUpdate = timestampMap[newStatus];
        if (tsUpdate && Object.keys(tsUpdate).length > 0) {
          await base44.asServiceRole.entities.Client.update(entityId, tsUpdate);
        }
      }

      // Auto-fill end_date_actual on Project completion
      if (entityName === 'Project' && newStatus === 'completed') {
        await base44.asServiceRole.entities.Project.update(entityId, {
          end_date_actual: new Date().toISOString().split('T')[0],
        });
      }

      return Response.json({ valid: true, from: oldStatus, to: newStatus, timestamped: true });
    }

    // INVALID TRANSITION — rollback
    const entityApi = base44.asServiceRole.entities[entityName];
    if (!entityApi) return Response.json({ error: 'entity not found' }, { status: 400 });

    await entityApi.update(entityId, { status: oldStatus });

    // Log error
    const clientId = data.client_id || (entityName === 'Client' ? entityId : '');
    await base44.asServiceRole.entities.Communication.create({
      client_id: clientId,
      type: 'system_error',
      direction: 'outbound',
      content: `🚫 מעבר סטטוס לא מורשה ב-${entityName}: "${oldStatus}" → "${newStatus}". בוצע rollback.`,
      sent_by: 'system',
      status: 'sent',
      channel: 'base44_native',
      error_detail: `Invalid transition: ${entityName}#${entityId} ${oldStatus} → ${newStatus}`,
    });

    return Response.json({ 
      valid: false, 
      rolledBack: true, 
      entity: entityName, 
      from: oldStatus, 
      to: newStatus 
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