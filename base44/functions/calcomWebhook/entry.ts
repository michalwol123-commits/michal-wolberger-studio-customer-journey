// Stage 5 — cal.com Webhook Handler
// Endpoint: POST /api/webhooks/calcom
// Events: BOOKING_CREATED, BOOKING_CANCELLED, BOOKING_RESCHEDULED
// Verifies HMAC signature, creates/updates Meeting records
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function verifySignature(body, signature, secret) {
  if (!secret || !signature) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const hex = Array.from(new Uint8Array(signed)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hex === signature;
}

Deno.serve(async (req) => {
  const rawBody = await req.text();

  try {
    // Verify webhook signature
    const secret = Deno.env.get('CALCOM_WEBHOOK_SECRET');
    const signature = req.headers.get('x-cal-signature-256') || '';

    if (secret && signature) {
      const valid = await verifySignature(rawBody, signature, secret);
      if (!valid) {
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const base44 = createClientFromRequest(req);
    const triggerEvent = payload.triggerEvent;
    const bookingPayload = payload.payload;

    if (!bookingPayload) {
      return Response.json({ skipped: true, reason: 'no payload' });
    }

    const uid = bookingPayload.uid;
    const attendees = bookingPayload.attendees || [];
    const attendeeEmail = attendees[0]?.email || '';
    const attendeeName = attendees[0]?.name || '';
    const attendeePhone = attendees[0]?.phoneNumber || '';

    // Try to find client by email or phone
    let clientId = null;
    if (attendeeEmail) {
      const byEmail = await base44.asServiceRole.entities.Client.filter({ email: attendeeEmail });
      if (byEmail.length > 0) clientId = byEmail[0].id;
    }
    if (!clientId && attendeePhone) {
      const phone = attendeePhone.replace(/[^0-9+]/g, '');
      const byPhone = await base44.asServiceRole.entities.Client.filter({ phone });
      if (byPhone.length > 0) clientId = byPhone[0].id;
    }

    if (triggerEvent === 'BOOKING_CREATED') {
      // If no client found, create a new lead
      if (!clientId) {
        const newClient = await base44.asServiceRole.entities.Client.create({
          name: attendeeName || 'לקוח cal.com',
          phone: attendeePhone || '',
          email: attendeeEmail || '',
          status: 'lead',
          source: 'website',
          source_detail: 'cal.com booking',
        });
        clientId = newClient.id;
      }

      // Determine meeting type from event type name
      const eventTitle = (bookingPayload.title || bookingPayload.eventTitle || '').toLowerCase();
      let meetingType = 'intro';
      if (eventTitle.includes('site') || eventTitle.includes('ביקור')) meetingType = 'site_visit';
      else if (eventTitle.includes('zoom') || eventTitle.includes('video')) meetingType = 'zoom';
      else if (eventTitle.includes('design') || eventTitle.includes('עיצוב')) meetingType = 'design_approval';

      await base44.asServiceRole.entities.Meeting.create({
        client_id: clientId,
        calendly_event_id: uid,
        type: meetingType,
        scheduled_at: bookingPayload.startTime,
        duration: bookingPayload.metadata?.videoCallUrl
          ? Math.round((new Date(bookingPayload.endTime) - new Date(bookingPayload.startTime)) / 60000)
          : 45,
        location: bookingPayload.location || bookingPayload.metadata?.videoCallUrl || '',
        status: 'scheduled',
      });

      // Log communication
      await base44.asServiceRole.entities.Communication.create({
        client_id: clientId,
        type: 'meeting',
        direction: 'inbound',
        content: `פגישה חדשה נקבעה דרך cal.com: ${bookingPayload.title || 'פגישה'} בתאריך ${bookingPayload.startTime}`,
        sent_by: 'client',
        status: 'sent',
        channel: 'base44_native',
      });

      return Response.json({ success: true, event: 'BOOKING_CREATED', clientId });
    }

    if (triggerEvent === 'BOOKING_CANCELLED') {
      if (uid) {
        const meetings = await base44.asServiceRole.entities.Meeting.filter({ calendly_event_id: uid });
        for (const m of meetings) {
          await base44.asServiceRole.entities.Meeting.update(m.id, { status: 'cancelled' });

          if (m.client_id) {
            await base44.asServiceRole.entities.Communication.create({
              client_id: m.client_id,
              type: 'meeting',
              direction: 'inbound',
              content: `פגישה בוטלה: ${bookingPayload.title || 'פגישה'} שהייתה מתוכננת ל-${m.scheduled_at}`,
              sent_by: 'client',
              status: 'sent',
              channel: 'base44_native',
            });
          }
        }
      }
      return Response.json({ success: true, event: 'BOOKING_CANCELLED' });
    }

    if (triggerEvent === 'BOOKING_RESCHEDULED') {
      if (uid) {
        // Cancel old meeting
        const oldUid = bookingPayload.rescheduleUid || uid;
        const oldMeetings = await base44.asServiceRole.entities.Meeting.filter({ calendly_event_id: oldUid });
        for (const m of oldMeetings) {
          await base44.asServiceRole.entities.Meeting.update(m.id, { status: 'rescheduled' });
        }

        // Create new meeting record
        const meetingClientId = oldMeetings[0]?.client_id || clientId;
        if (meetingClientId) {
          await base44.asServiceRole.entities.Meeting.create({
            client_id: meetingClientId,
            calendly_event_id: uid,
            type: oldMeetings[0]?.type || 'intro',
            scheduled_at: bookingPayload.startTime,
            duration: Math.round((new Date(bookingPayload.endTime) - new Date(bookingPayload.startTime)) / 60000) || 45,
            location: bookingPayload.location || '',
            status: 'scheduled',
          });

          await base44.asServiceRole.entities.Communication.create({
            client_id: meetingClientId,
            type: 'meeting',
            direction: 'inbound',
            content: `פגישה נדחתה ונקבעה מחדש: ${bookingPayload.startTime}`,
            sent_by: 'client',
            status: 'sent',
            channel: 'base44_native',
          });
        }
      }
      return Response.json({ success: true, event: 'BOOKING_RESCHEDULED' });
    }

    return Response.json({ skipped: true, event: triggerEvent });
  } catch (error) {
    try {
      const base44 = createClientFromRequest(JSON.parse(rawBody));
      await base44.asServiceRole.entities.Communication.create({
        client_id: '',
        type: 'system_error',
        direction: 'outbound',
        content: `cal.com Webhook failed: ${error.message}`,
        sent_by: 'system',
        status: 'failed',
        channel: 'base44_native',
        error_detail: error.message,
        retry_count: 99,
      });
    } catch (_) { /* silent */ }
    return Response.json({ error: error.message }, { status: 500 });
  }
});