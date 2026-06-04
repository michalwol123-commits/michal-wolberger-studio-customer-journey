// generateFieldReport — יצירת PDF דוח ביקור שטח + שליחה במייל
// Trigger: FieldVisit record_updated — כאשר report_requested_at משתנה
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@4.0.0';

const LOGO_URL = 'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/a6efb9133_image1.png';

const COLORS = {
  brown:     [139, 115, 85],
  darkBrown: [90, 70, 50],
  beige:     [250, 248, 245],
  cream:     [245, 240, 234],
  dark:      [44, 44, 44],
  white:     [255, 255, 255],
  red:       [200, 60, 60],
  green:     [60, 160, 80],
  gray:      [150, 150, 150],
};

async function loadHeeboFont(doc) {
  const cssResp = await fetch(
    'https://fonts.googleapis.com/css?family=Heebo&subset=hebrew',
    { headers: { 'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)' } }
  );
  const css = await cssResp.text();
  const ttfUrl = css.split('\n').filter(l => l.includes('.ttf'))[0]
    ?.match(/url\(([^)]+)\)/)?.[1]?.replace(/['"]/g, '');
  if (!ttfUrl) throw new Error('Heebo font URL not found');
  const fontResp = await fetch(ttfUrl);
  const fontArr = new Uint8Array(await fontResp.arrayBuffer());
  let binary = '';
  fontArr.forEach(b => binary += String.fromCharCode(b));
  const heeboBase64 = btoa(binary);
  doc.addFileToVFS('Heebo.ttf', heeboBase64);
  doc.addFont('Heebo.ttf', 'Heebo', 'normal');
  doc.setFont('Heebo');
}

async function fetchImageAsBase64(url) {
  try {
    const resp = await fetch(url);
    const arr = new Uint8Array(await resp.arrayBuffer());
    let binary = '';
    arr.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, old_data } = await req.json();

    // Skip if report_requested_at didn't change
    if (!data?.report_requested_at) {
      return Response.json({ skipped: true, reason: 'no report_requested_at' });
    }
    if (data.report_requested_at === old_data?.report_requested_at) {
      return Response.json({ skipped: true, reason: 'unchanged' });
    }

    const visitId = data.id;

    const [visits, findingsList, projects] = await Promise.all([
      base44.asServiceRole.entities.FieldVisit.filter({ id: visitId }),
      base44.asServiceRole.entities.FieldFinding.filter({ field_visit_id: visitId }),
      base44.asServiceRole.entities.Project.filter({ id: data.project_id }),
    ]);

    const visit = visits[0];
    if (!visit) return Response.json({ error: 'visit not found' }, { status: 404 });

    const project = projects[0];
    const clients = project?.client_id
      ? await base44.asServiceRole.entities.Client.filter({ id: project.client_id })
      : [];
    const client = clients[0];

    const checklist = (() => {
      try { return JSON.parse(visit.checklist_items || '[]'); } catch { return []; }
    })();

    const visitTypeHe = visit.visit_type === 'supervision' ? 'פיקוח' : 'התקנות';
    const visitDateHe = visit.visit_date
      ? new Date(visit.visit_date).toLocaleDateString('he-IL')
      : '—';
    const projectName = project?.name || 'פרויקט';

    // ── Build PDF ──
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    await loadHeeboFont(doc);

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = margin;

    const newPage = () => {
      doc.addPage();
      y = margin;
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.gray);
      doc.text('MICHAL WOLBERGER INTERIOR DESIGN', pageW / 2, pageH - 8, { align: 'center' });
    };

    const checkNewPage = (needed) => {
      if (y + needed > pageH - 20) newPage();
    };

    const drawLine = (color) => {
      const c = color || COLORS.cream;
      doc.setDrawColor(...c);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageW - margin, y);
    };

    // ── HEADER ──
    doc.setFillColor(...COLORS.beige);
    doc.rect(0, 0, pageW, 45, 'F');

    try {
      const logoB64 = await fetchImageAsBase64(LOGO_URL);
      if (logoB64) doc.addImage(logoB64, 'PNG', pageW - margin - 35, 6, 35, 14);
    } catch {}

    doc.setFontSize(18);
    doc.setTextColor(...COLORS.darkBrown);
    doc.text('דוח ביקור שטח', margin, 18);

    doc.setFontSize(11);
    doc.setTextColor(...COLORS.brown);
    doc.text(projectName, margin, 26);

    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gray);
    doc.text(`תאריך: ${visitDateHe}   |   סוג ביקור: ${visitTypeHe}`, margin, 33);
    y = 52;

    // ── SECTION A: Checklist ──
    const okItems    = checklist.filter(i => i.status === 'ok');
    const issueItems = checklist.filter(i => i.status === 'issue');

    if (checklist.length > 0) {
      checkNewPage(12);
      doc.setFontSize(13);
      doc.setTextColor(...COLORS.darkBrown);
      doc.text("א. סיכום צ'קליסט", pageW - margin, y, { align: 'right' });
      y += 2;
      drawLine(COLORS.brown);
      y += 6;

      doc.setFontSize(10);
      doc.setTextColor(...COLORS.green);
      doc.text(`✓ תקין: ${okItems.length}`, pageW - margin, y, { align: 'right' });
      doc.setTextColor(...COLORS.red);
      doc.text(`⚠ ממצאים: ${issueItems.length}`, pageW - margin - 45, y, { align: 'right' });
      y += 6;

      for (const item of issueItems) {
        checkNewPage(10);
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.dark);
        doc.text(`• ${item.label}`, pageW - margin - 3, y, { align: 'right' });
        y += 5;
        if (item.note) {
          doc.setFontSize(8);
          doc.setTextColor(...COLORS.gray);
          doc.text(item.note, pageW - margin - 6, y, { align: 'right' });
          y += 5;
        }
      }
      y += 4;
    }

    // ── SECTION B: Findings ──
    const catHe = {
      structure: 'בנייה', finishing: 'גמרים', electrical: 'חשמל',
      plumbing: 'אינסטלציה', carpentry: 'נגרות', other: 'אחר',
    };
    const sevHe = { low: 'נמוך', medium: 'בינוני', high: 'גבוה' };

    if (findingsList.length > 0) {
      checkNewPage(12);
      doc.setFontSize(13);
      doc.setTextColor(...COLORS.darkBrown);
      doc.text('ב. ממצאים וליקויים', pageW - margin, y, { align: 'right' });
      y += 2;
      drawLine(COLORS.brown);
      y += 7;

      for (let i = 0; i < findingsList.length; i++) {
        const f = findingsList[i];
        checkNewPage(22);

        doc.setFontSize(10);
        doc.setTextColor(...COLORS.darkBrown);
        doc.text(`#${f.finding_number || i + 1}  ${catHe[f.category] || f.category}`, pageW - margin, y, { align: 'right' });
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.gray);
        doc.text(`חומרה: ${sevHe[f.severity] || f.severity}`, margin + 30, y);
        y += 5;

        doc.setFontSize(9);
        doc.setTextColor(...COLORS.dark);
        const descLines = doc.splitTextToSize(f.description, pageW - margin * 2 - 5);
        for (const line of descLines) {
          checkNewPage(6);
          doc.text(line, pageW - margin, y, { align: 'right' });
          y += 5;
        }

        if (f.location) {
          checkNewPage(5);
          doc.setFontSize(8);
          doc.setTextColor(...COLORS.gray);
          doc.text(`מיקום: ${f.location}`, pageW - margin, y, { align: 'right' });
          y += 5;
        }

        if (f.photo_url) {
          checkNewPage(55);
          try {
            const imgB64 = await fetchImageAsBase64(f.photo_url);
            if (imgB64) {
              doc.addImage(imgB64, 'JPEG', pageW - margin - 70, y, 70, 50);
              y += 54;
            }
          } catch {}
        }

        if (f.notes) {
          checkNewPage(8);
          doc.setFontSize(8);
          doc.setTextColor(...COLORS.gray);
          doc.text(`הערה: ${f.notes}`, pageW - margin, y, { align: 'right' });
          y += 5;
        }

        if (i < findingsList.length - 1) {
          checkNewPage(4);
          drawLine();
          y += 4;
        }
      }
      y += 6;
    }

    // ── SECTION C: Meeting summary ──
    if (visit.attendees || visit.decisions || visit.next_steps || visit.general_notes) {
      checkNewPage(12);
      doc.setFontSize(13);
      doc.setTextColor(...COLORS.darkBrown);
      doc.text('ג. סיכום ביקור', pageW - margin, y, { align: 'right' });
      y += 2;
      drawLine(COLORS.brown);
      y += 7;

      const writeField = (label, value) => {
        if (!value) return;
        checkNewPage(8);
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.brown);
        doc.text(label, pageW - margin, y, { align: 'right' });
        y += 5;
        doc.setTextColor(...COLORS.dark);
        const lines = doc.splitTextToSize(value, pageW - margin * 2);
        for (const line of lines) {
          checkNewPage(5);
          doc.text(line, pageW - margin, y, { align: 'right' });
          y += 5;
        }
        y += 2;
      };

      writeField('נוכחים:', visit.attendees);
      writeField('מה סוכם:', visit.decisions);
      writeField('צעדים הבאים:', visit.next_steps);
      writeField('הערות כלליות:', visit.general_notes);
    }

    // ── FOOTER ──
    const footerY = Math.max(y + 10, pageH - 25);
    if (footerY < pageH - 5) {
      doc.setDrawColor(...COLORS.cream);
      doc.setLineWidth(0.3);
      doc.line(margin, footerY, pageW - margin, footerY);
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.gray);
      doc.text(`הוכן ע"י: מיכל וולברגר, מעצבת פנים`, pageW - margin, footerY + 5, { align: 'right' });
      doc.text('MICHAL WOLBERGER INTERIOR DESIGN', margin, footerY + 5);
      doc.text(`נוצר: ${new Date().toLocaleDateString('he-IL')}`, pageW - margin, footerY + 10, { align: 'right' });
    }

    // ── Export & Upload ──
    const pdfOutput = doc.output('arraybuffer');
    const pdfUint8  = new Uint8Array(pdfOutput);
    const pdfFile   = new File(
      [new Blob([pdfUint8], { type: 'application/pdf' })],
      `field_report_${visitId}_${Date.now()}.pdf`,
      { type: 'application/pdf' }
    );

    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfFile });
    const pdfUrl = uploadResult.file_url;

    // ── Email via Brevo ──
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    const sentTo = visit.report_sent_to || client?.email || '';

    if (BREVO_API_KEY && sentTo) {
      let binaryStr = '';
      pdfUint8.forEach(b => binaryStr += String.fromCharCode(b));
      const pdfBase64 = btoa(binaryStr);

      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: { name: 'מיכל וולברגר עיצוב פנים', email: 'michalwol123@gmail.com' },
          to: [{ email: sentTo, name: client?.name || 'לקוח יקר' }],
          subject: `דוח ביקור שטח — ${projectName} (${visitDateHe})`,
          htmlContent: `
            <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;">
              <img src="${LOGO_URL}" style="height:40px;margin-bottom:16px;" />
              <h2 style="color:#5A4632;">דוח ביקור שטח</h2>
              <p>שלום ${client?.name || ''},</p>
              <p>מצורף דוח ביקור ה${visitTypeHe} מתאריך ${visitDateHe} עבור הפרויקט: <strong>${projectName}</strong></p>
              ${findingsList.length > 0
                ? `<p>נמצאו <strong>${findingsList.length} ממצאים</strong> המפורטים בדוח המצורף.</p>`
                : '<p>הביקור עבר ללא ממצאים משמעותיים.</p>'}
              ${visit.next_steps ? `<p><strong>צעדים הבאים:</strong><br/>${visit.next_steps.replace(/\n/g, '<br/>')}</p>` : ''}
              <p style="margin-top:24px;color:#888;font-size:12px;">מיכל וולברגר | עיצוב פנים</p>
            </div>`,
          attachment: [{
            content: pdfBase64,
            name: `דוח_ביקור_שטח_${visitDateHe.replace(/\//g, '-')}.pdf`,
          }],
        }),
      });
    }

    // ── Update FieldVisit ──
    await base44.asServiceRole.entities.FieldVisit.update(visitId, {
      report_pdf_url: pdfUrl,
      report_sent_at: new Date().toISOString(),
      report_sent_to: sentTo,
      status: 'completed',
    });

    return Response.json({ success: true, pdfUrl, sentTo });

  } catch (err) {
    console.error('generateFieldReport error:', err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
});