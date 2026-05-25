import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);
    const { token, signer_name, signature_image_url } = body;

    if (!token || !signer_name || !signature_image_url) {
      return Response.json({ error: 'missing_fields' }, { status: 400 });
    }

    let docs = await base44.asServiceRole.entities.Document.filter({ signature_token: token });
    if (!docs?.length) {
      const pending = await base44.asServiceRole.entities.Document.filter({ signature_status: 'pending_signature' });
      docs = pending.filter(d => d.signature_token === token);
    }
    if (!docs?.length) return Response.json({ error: 'not_found' }, { status: 404 });
    const doc = docs[0];
    if (doc.signature_status === 'signed') return Response.json({ error: 'already_signed' }, { status: 410 });

    const signedAt = new Date().toISOString();
    const signedAtDisplay = new Date().toLocaleString('he-IL');
    let signedFileUrl = doc.file_url;

    try {
      let heeboBase64 = '';
      try {
        const cssResp = await fetch(
          'https://fonts.googleapis.com/css?family=Heebo&subset=hebrew',
          { headers: { 'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)' } }
        );
        const css = await cssResp.text();
        const ttfLines = css.split('\n').filter(l => l.includes('.ttf'));
        const ttfUrl = ttfLines[0]?.match(/url\(([^)]+)\)/)?.[1]?.replace(/['"]/g, '');
        if (ttfUrl) {
          const fontResp = await fetch(ttfUrl);
          const fontBuf = await fontResp.arrayBuffer();
          const fontArr = new Uint8Array(fontBuf);
          let binary = '';
          fontArr.forEach(b => { binary += String.fromCharCode(b); });
          heeboBase64 = btoa(binary);
        }
      } catch (fontErr) {
        console.error('Font fetch failed:', fontErr);
      }

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      if (heeboBase64) {
        pdf.addFileToVFS('Heebo.ttf', heeboBase64);
        pdf.addFont('Heebo.ttf', 'Heebo', 'normal');
        pdf.setFont('Heebo');
      }

      const pageW = 210;
      const pageH = 297;
      const margin = 20;

      pdf.setFillColor(139, 115, 85);
      pdf.rect(0, 0, pageW, 45, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.text('סטודיו מיכל וולברגר', pageW - margin, 22, { align: 'right' });
      pdf.setFontSize(11);
      pdf.text('אישור חתימה דיגיטלית', pageW - margin, 33, { align: 'right' });

      let y = 65;

      const drawRow = (label, value) => {
        pdf.setTextColor(139, 115, 85);
        pdf.text(label, pageW - margin, y, { align: 'right' });
        pdf.setTextColor(44, 44, 44);
        pdf.text(value, pageW - margin - 32, y, { align: 'right' });
        y += 10;
      };

      pdf.setFontSize(11);
      drawRow('מסמך:', doc.name || 'מסמך לחתימה');
      drawRow('חותם/ת:', signer_name);
      drawRow('תאריך:', signedAtDisplay);

      pdf.setDrawColor(200, 190, 180);
      pdf.setLineWidth(0.3);
      pdf.line(margin, y + 5, pageW - margin, y + 5);

      y += 18;
      pdf.setTextColor(139, 115, 85);
      pdf.setFontSize(11);
      pdf.text('חתימה:', pageW - margin, y, { align: 'right' });

      y += 6;
      pdf.setFillColor(248, 246, 243);
      pdf.setDrawColor(200, 190, 180);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(margin, y, 100, 40, 2, 2, 'FD');

      pdf.addImage(signature_image_url, 'PNG', margin + 2, y + 2, 96, 36);

      y += 44;
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(9);
      pdf.text(signer_name, margin + 50, y, { align: 'center' });

      pdf.setFillColor(139, 115, 85);
      pdf.rect(0, pageH - 20, pageW, 20, 'F');
      pdf.setTextColor(245, 240, 234);
      pdf.setFontSize(8);
      pdf.text('Michal Wolberger Interior Design', pageW / 2, pageH - 8, { align: 'center' });

      const pdfBytes = pdf.output('arraybuffer');
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const file = new File([blob], `חתום_${(doc.name || 'מסמך').replace(/\s/g, '_')}.pdf`, { type: 'application/pdf' });
      const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
      if (uploadResult?.file_url) signedFileUrl = uploadResult.file_url;

    } catch (pdfErr) {
      console.error('PDF error:', pdfErr.message);
    }

    await base44.asServiceRole.entities.Document.update(doc.id, {
      signature_status: 'signed',
      signed_at: signedAt,
      signer_name,
      signature_image_url,
      file_url: signedFileUrl,
    });

    if (doc.client_id) {
      await base44.asServiceRole.entities.Communication.create({
        client_id: doc.client_id,
        project_id: doc.project_id || undefined,
        type: 'note',
        direction: 'inbound',
        content: `✍️ המסמך "${doc.name}" נחתם דיגיטלית על ידי ${signer_name} ב-${signedAtDisplay}`,
        sent_by: 'system',
        status: 'sent',
        channel: 'base44_native',
      });
    }

    try {
      const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: { name: 'סטודיו מיכל וולברגר', email: 'michalwol123@gmail.com' },
          to: [{ email: 'michalwol123@gmail.com' }],
          subject: `✍️ מסמך נחתם: ${doc.name}`,
          htmlContent: `<div dir="rtl" style="font-family:Arial,sans-serif;padding:20px;">
            <h2 style="color:#8B7355;">מסמך נחתם ✍️</h2>
            <p><strong>${doc.name}</strong> נחתם על ידי <strong>${signer_name}</strong> ב-${signedAtDisplay}</p>
            <p><a href="${signedFileUrl}" style="background:#8B7355;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">צפה ב-PDF החתום</a></p>
          </div>`
        })
      });
    } catch (_) {}

    return Response.json({ status: 'ok', file_url: signedFileUrl });
  } catch (err) {
    console.error('submitSignature error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});