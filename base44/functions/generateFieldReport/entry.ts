// generateFieldReport — יצירת PDF דוח ביקור שטח + שליחה ישירה דרך Brevo
// Trigger: FieldVisit record_updated — כאשר report_requested_at משתנה
// OR: Called directly with { visitId, mode: 'preview' } for preview without email
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@4.0.0';

const LOGO_URL = 'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/a6efb9133_image1.png';
const HEEBO_TTF_URL = 'https://github.com/google/fonts/raw/main/ofl/heebo/Heebo%5Bwght%5D.ttf';

const COLORS = {
  brown:     [139, 115, 85],
  darkBrown: [90, 70, 50],
  beige:     [250, 248, 245],
  cream:     [245, 240, 234],
  dark:      [44, 44, 44],
  red:       [200, 60, 60],
  green:     [60, 160, 80],
  gray:      [150, 150, 150],
};

const HEB = /[\u0590-\u05FF]/;
const MIRROR = { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<' };
const fixRtl = (s) => s.replace(/[()\[\]{}<>]/g, (c) => MIRROR[c] ?? c);

async function fetchBase64(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('fetch failed ' + resp.status + ' ' + url);
  const buf = new Uint8Array(await resp.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function fetchBase64Chunked(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('fetch failed ' + resp.status);
  const buf = new Uint8Array(await resp.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support two call modes:
    // 1. Entity automation: { data, old_data } — triggered on FieldVisit update
    // 2. Direct call: { visitId, mode } — called from frontend for preview/send
    let visitId, isPreview = false;

    if (body.visitId) {
      // Direct call mode
      visitId = body.visitId;
      isPreview = body.mode === 'preview';
    } else if (body.data) {
      // Entity automation mode
      const { data, old_data } = body;
      if (!data?.report_requested_at) return Response.json({ skipped: true, reason: 'no report_requested_at' });
      if (data.report_requested_at === old_data?.report_requested_at) return Response.json({ skipped: true, reason: 'unchanged' });
      visitId = data.id;
    } else {
      return Response.json({ skipped: true, reason: 'no data' });
    }

    const [visits, findingsList] = await Promise.all([
      base44.asServiceRole.entities.FieldVisit.filter({ id: visitId }),
      base44.asServiceRole.entities.FieldFinding.filter({ field_visit_id: visitId }),
    ]);

    const visit = visits[0];
    if (!visit) return Response.json({ error: 'visit not found' }, { status: 404 });

    const projects = await base44.asServiceRole.entities.Project.filter({ id: visit.project_id });
    const project = projects[0];
    const clients = project?.client_id ? await base44.asServiceRole.entities.Client.filter({ id: project.client_id }) : [];
    const client = clients[0];

    const checklist = (() => { try { return JSON.parse(visit.checklist_items || '[]'); } catch { return []; } })();
    const visitTypeHe = visit.visit_type === 'supervision' ? 'פיקוח' : 'התקנות';
    const visitDateHe = visit.visit_date ? new Date(visit.visit_date).toLocaleDateString('he-IL') : '—';
    const projectName = project?.name || 'פרויקט';

    // Load Heebo font
    const heeboBase64 = await fetchBase64(HEEBO_TTF_URL).catch(e => { console.error('Heebo failed:', e); return ''; });

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    if (heeboBase64) {
      doc.addFileToVFS('Heebo.ttf', heeboBase64);
      doc.addFont('Heebo.ttf', 'Heebo', 'normal');
      doc.setFont('Heebo');
    }

    const W = 210, H = 297, margin = 15;
    let y = margin;

    const put = (txt, x, yPos, align, size) => {
      const t = String(txt ?? '');
      if (!t) return;
      doc.setFontSize(size);
      const rtl = HEB.test(t);
      doc.setR2L(rtl);
      doc.text(rtl ? fixRtl(t) : t, x, yPos, { align });
      doc.setR2L(false);
    };

    const newPage = () => {
      doc.addPage();
      y = margin;
      doc.setTextColor(...COLORS.gray);
      put('MICHAL WOLBERGER INTERIOR DESIGN', W / 2, H - 8, 'center', 8);
    };
    const checkNewPage = (n) => { if (y + n > H - 20) newPage(); };
    const drawLine = (c) => {
      doc.setDrawColor(...(c || COLORS.cream));
      doc.setLineWidth(0.3);
      doc.line(margin, y, W - margin, y);
    };

    // Header
    doc.setFillColor(...COLORS.beige);
    doc.rect(0, 0, W, 45, 'F');
    try { const lb = await fetchBase64(LOGO_URL); if (lb) doc.addImage(lb, 'PNG', W - margin - 35, 6, 35, 14); } catch {}
    doc.setTextColor(...COLORS.darkBrown); put('דוח ביקור שטח', margin, 18, 'left', 18);
    doc.setTextColor(...COLORS.brown);    put(projectName, margin, 26, 'left', 11);
    doc.setTextColor(...COLORS.gray);     put('תאריך: ' + visitDateHe + '   |   סוג: ' + visitTypeHe, margin, 33, 'left', 9);
    y = 52;

    // Section A — Checklist
    const okItems    = checklist.filter(i => i.status === 'ok');
    const issueItems = checklist.filter(i => i.status === 'issue');

    if (checklist.length > 0) {
      checkNewPage(12);
      doc.setTextColor(...COLORS.darkBrown);
      put("א. סיכום צ'קליסט", W - margin, y, 'right', 13);
      y += 2; drawLine(COLORS.brown); y += 6;
      doc.setTextColor(...COLORS.green);  put('✓ תקין: ' + okItems.length, W - margin, y, 'right', 10);
      doc.setTextColor(...COLORS.red);    put('⚠ ממצאים: ' + issueItems.length, W - margin - 45, y, 'right', 10);
      y += 6;

      for (var ci = 0; ci < issueItems.length; ci++) {
        var item = issueItems[ci];
        checkNewPage(10);
        doc.setTextColor(...COLORS.dark); put('• ' + item.label, W - margin - 3, y, 'right', 9); y += 5;
        if (item.note) { doc.setTextColor(...COLORS.gray); put(item.note, W - margin - 6, y, 'right', 8); y += 5; }
        if (item.photo_url) {
          checkNewPage(45);
          try { var ib = await fetchBase64(item.photo_url); if (ib) { doc.addImage(ib, 'JPEG', W - margin - 60, y, 60, 40); y += 43; } } catch {}
        }
      }
      y += 4;
    }

    // Section B — Findings
    const catHe = { structure: 'בנייה', finishing: 'גמרים', electrical: 'חשמל', plumbing: 'אינסטלציה', carpentry: 'נגרות', other: 'אחר' };
    const sevHe = { low: 'נמוך', medium: 'בינוני', high: 'גבוה' };

    if (findingsList.length > 0) {
      checkNewPage(12);
      doc.setTextColor(...COLORS.darkBrown); put('ב. ממצאים וליקויים', W - margin, y, 'right', 13);
      y += 2; drawLine(COLORS.brown); y += 7;

      for (var fi = 0; fi < findingsList.length; fi++) {
        var f = findingsList[fi];
        checkNewPage(22);
        doc.setTextColor(...COLORS.darkBrown);
        put('#' + (f.finding_number || fi + 1) + '  ' + (catHe[f.category] || f.category), W - margin, y, 'right', 10);
        doc.setTextColor(...COLORS.gray); put('חומרה: ' + (sevHe[f.severity] || f.severity), margin + 30, y, 'left', 9);
        y += 5;
        doc.setTextColor(...COLORS.dark);
        var dl = doc.splitTextToSize(f.description, W - margin * 2 - 5);
        for (var di = 0; di < dl.length; di++) { checkNewPage(6); put(dl[di], W - margin, y, 'right', 9); y += 5; }
        if (f.location) { checkNewPage(5); doc.setTextColor(...COLORS.gray); put('מיקום: ' + f.location, W - margin, y, 'right', 8); y += 5; }
        if (f.photo_url) {
          checkNewPage(55);
          try { var fb = await fetchBase64(f.photo_url); if (fb) { doc.addImage(fb, 'JPEG', W - margin - 70, y, 70, 50); y += 54; } } catch {}
        }
        if (f.notes) { checkNewPage(8); doc.setTextColor(...COLORS.gray); put('הערה: ' + f.notes, W - margin, y, 'right', 8); y += 5; }
        if (fi < findingsList.length - 1) { checkNewPage(4); drawLine(); y += 4; }
      }
      y += 6;
    }

    // Section C — Meeting summary
    if (visit.attendees || visit.decisions || visit.next_steps || visit.general_notes) {
      checkNewPage(12);
      doc.setTextColor(...COLORS.darkBrown); put('ג. סיכום ביקור', W - margin, y, 'right', 13);
      y += 2; drawLine(COLORS.brown); y += 7;

      const wf = (label, value) => {
        if (!value) return;
        checkNewPage(8);
        doc.setTextColor(...COLORS.brown); put(label, W - margin, y, 'right', 9); y += 5;
        doc.setTextColor(...COLORS.dark);
        var ls = doc.splitTextToSize(value, W - margin * 2);
        for (var li = 0; li < ls.length; li++) { checkNewPage(5); put(ls[li], W - margin, y, 'right', 9); y += 5; }
        y += 2;
      };
      wf('נוכחים:', visit.attendees);
      wf('מה סוכם:', visit.decisions);
      wf('צעדים הבאים:', visit.next_steps);
      wf('הערות כלליות:', visit.general_notes);
    }

    // Footer
    var fy = Math.max(y + 10, H - 25);
    if (fy < H - 5) {
      doc.setDrawColor(...COLORS.cream); doc.setLineWidth(0.3); doc.line(margin, fy, W - margin, fy);
      doc.setTextColor(...COLORS.gray);
      put('הוכן ע"י: מיכל וולברגר, מעצבת פנים', W - margin, fy + 5, 'right', 8);
      put('MICHAL WOLBERGER INTERIOR DESIGN', margin, fy + 5, 'left', 8);
      put('נוצר: ' + new Date().toLocaleDateString('he-IL'), W - margin, fy + 10, 'right', 8);
    }

    // Upload PDF
    const pdfBytes = doc.output('arraybuffer');
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const file = new File([blob], 'field_report_' + visitId + '_' + Date.now() + '.pdf', { type: 'application/pdf' });
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    const pdfUrl = file_url;

    // Update FieldVisit with PDF URL
    await base44.asServiceRole.entities.FieldVisit.update(visitId, {
      report_pdf_url: pdfUrl,
      status: 'completed',
    });

    // If preview mode — return URL without sending email
    if (isPreview) {
      return Response.json({ success: true, file_url: pdfUrl, mode: 'preview' });
    }

    // ── Send email directly via Brevo (like autoQuoteSent) ──
    if (client?.id && client?.email) {
      const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
      const clientName = client.name || 'לקוח/ה';
      const subject = 'דוח ביקור שטח — ' + projectName + ' (' + visitDateHe + ')';

      const htmlBody = `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#8B7355;padding:32px;text-align:center;color:white;">
          <h1 style="margin:0;font-size:22px;">סטודיו מיכל וולברגר</h1>
          <p style="margin:8px 0 0;font-size:13px;opacity:0.85;">עיצוב פנים</p>
        </div>
        <div style="padding:32px;">
          <p>שלום ${clientName},</p>
          <p>מצורף דוח ביקור ה${visitTypeHe} מתאריך ${visitDateHe} עבור הפרויקט: <strong>${projectName}</strong>.</p>
          ${findingsList.length > 0 ? '<p>נמצאו ' + findingsList.length + ' ממצאים המפורטים בדוח.</p>' : '<p>הביקור עבר ללא ממצאים משמעותיים.</p>'}
          ${visit.next_steps ? '<p><strong>צעדים הבאים:</strong><br/>' + visit.next_steps.replace(/\n/g, '<br/>') + '</p>' : ''}
          <p>בברכה,<br/>מיכל וולברגר - עיצוב פנים</p>
        </div>
        <div style="text-align:center;font-size:12px;color:#999;padding:16px;">סטודיו מיכל וולברגר | עיצוב פנים<br/>הודעה זו נשלחה אוטומטית</div>
      </div>`;

      const brevoPayload = {
        sender: { name: 'סטודיו מיכל וולברגר', email: 'michalwol123@gmail.com' },
        to: [{ email: client.email, name: clientName }],
        subject: subject,
        htmlContent: htmlBody,
      };

      // Attach PDF
      const pdfAttachBase64 = await fetchBase64Chunked(pdfUrl);
      brevoPayload.attachment = [{ content: pdfAttachBase64, name: 'field_report_' + projectName + '.pdf' }];

      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(brevoPayload),
      });
      if (!brevoRes.ok) throw new Error('Brevo error: ' + JSON.stringify(await brevoRes.json()));

      // Create Communication with status: 'sent'
      await base44.asServiceRole.entities.Communication.create({
        client_id: client.id,
        project_id: visit.project_id,
        type: 'email',
        direction: 'outbound',
        subject: subject,
        content: 'דוח ביקור ' + visitTypeHe + ' מתאריך ' + visitDateHe + ' נשלח עם PDF מצורף ל-' + client.email,
        sent_by: 'system',
        status: 'sent',
        channel: 'gmail',
        attachment_url: pdfUrl,
      });

      // Update FieldVisit sent info
      await base44.asServiceRole.entities.FieldVisit.update(visitId, {
        report_sent_at: new Date().toISOString(),
        report_sent_to: client.email,
      });
    }

    return Response.json({ success: true, file_url: pdfUrl, sentTo: client?.email || '' });

  } catch (err) {
    console.error('generateFieldReport error:', err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
});