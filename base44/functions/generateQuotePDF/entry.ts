// Generate a styled PDF quote for Michal Wolberger Interior Design
// Called from frontend: base44.functions.invoke('generateQuotePDF', { client_id, title, package_type, total_amount, scope, meeting_date })
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';


const LOGO_URL = 'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/a6efb9133_image1.png';


const PACKAGE_LABELS = { basic: 'בסיסי', mid: 'בינוני', premium: 'פרימיום' };


// Brand colors from Michal's website
const COLORS = {
 brown: [139, 115, 85],       // #8B7355
 darkBrown: [90, 70, 50],     // #5A4632
 beige: [250, 248, 245],      // #FAF8F5
 cream: [245, 240, 234],      // #F5F0EA
 dark: [44, 44, 44],          // #2C2C2C
 white: [255, 255, 255],
};


Deno.serve(async (req) => {
 try {
   const base44 = createClientFromRequest(req);
   const user = await base44.auth.me();
   if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });


   const { client_id, quote_id, title, package_type, total_amount, scope, meeting_date } = await req.json();


   // Fetch client
   const clients = await base44.asServiceRole.entities.Client.filter({ id: client_id });
   if (clients.length === 0) return Response.json({ error: 'Client not found' }, { status: 404 });
   const client = clients[0];


   // Load Hebrew Heebo font for proper Hebrew/RTL rendering
   let heeboBase64 = '';
   try {
     const cssResp = await fetch(
       'https://fonts.googleapis.com/css?family=Heebo&subset=hebrew',
       { headers: { 'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)' } }
     );
     const css = await cssResp.text();
     const ttfLines = css.split('\n').filter(l => l.includes('.ttf'));
     const ttfUrl = ttfLines[0] && ttfLines[0].match(/url\(([^)]+)\)/)?.[1]?.replace(/['"]/g, '');
     if (ttfUrl) {
       const fontResp = await fetch(ttfUrl);
       const fontBuf = await fontResp.arrayBuffer();
       const fontArr = new Uint8Array(fontBuf);
       let binary = '';
       fontArr.forEach(b => { binary += String.fromCharCode(b); });
       heeboBase64 = btoa(binary);
     }
   } catch (fontErr) {
     console.error('Hebrew font fetch failed:', fontErr);
   }


   const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
   if (heeboBase64) {
     doc.addFileToVFS('Heebo.ttf', heeboBase64);
     doc.addFont('Heebo.ttf', 'Heebo', 'normal');
     doc.setFont('Heebo');
   }
   const pageW = 210;
   const pageH = 297;
   const margin = 20;
   const contentW = pageW - margin * 2;


   // --- Header background ---
   doc.setFillColor(...COLORS.brown);
   doc.rect(0, 0, pageW, 50, 'F');


   // Header text (RTL - right aligned)
   doc.setTextColor(...COLORS.white);
   doc.setFontSize(24);
   doc.text('Michal Wolberger', pageW - margin, 22, { align: 'right' });
   doc.setFontSize(11);
   doc.text('Interior Design', pageW - margin, 30, { align: 'right' });


   // --- Decorative line ---
   doc.setFillColor(...COLORS.cream);
   doc.rect(0, 50, pageW, 4, 'F');


   // --- Quote title ---
   let y = 68;
   doc.setTextColor(...COLORS.darkBrown);
   doc.setFontSize(20);
   doc.text('proposal', pageW / 2, y, { align: 'center' });
  
   y += 6;
   doc.setFontSize(12);
   doc.setTextColor(...COLORS.brown);
   doc.text(title || '', pageW / 2, y + 6, { align: 'center' });


   // --- Date line ---
   y += 18;
   doc.setDrawColor(...COLORS.cream);
   doc.setLineWidth(0.5);
   doc.line(margin, y, pageW - margin, y);


   // --- Client details section ---
   y += 10;
   doc.setFontSize(10);
   doc.setTextColor(...COLORS.dark);


   const today = new Date().toLocaleDateString('he-IL');
   const rows = [
     [':', today, 'date'],
     [':', client.name || '', 'client'],
     [':', client.phone || '', 'phone'],
   ];
   if (client.email) rows.push([':', client.email, 'email']);
   if (meeting_date) {
     const md = new Date(meeting_date).toLocaleDateString('he-IL');
     rows.push([':', md, 'meeting date']);
   }


   rows.forEach(([sep, val, label]) => {
     doc.setTextColor(...COLORS.brown);
     doc.text(label, pageW - margin, y, { align: 'right' });
     doc.setTextColor(...COLORS.dark);
     doc.text(`${val}`, pageW - margin - 40, y, { align: 'right' });
     y += 7;
   });


   // --- Package & Amount box ---
   y += 5;
   doc.setFillColor(...COLORS.cream);
   doc.roundedRect(margin, y, contentW, 28, 3, 3, 'F');


   doc.setFontSize(13);
   doc.setTextColor(...COLORS.darkBrown);
   const pkgLabel = PACKAGE_LABELS[package_type] || package_type || '';
   doc.text(`${pkgLabel} package`, pageW - margin - 8, y + 11, { align: 'right' });


   doc.setFontSize(18);
   doc.setTextColor(...COLORS.brown);
   const amountStr = `${Number(total_amount).toLocaleString('he-IL')} ILS`;
   doc.text(amountStr, pageW - margin - 8, y + 22, { align: 'right' });


   // --- Scope / Description ---
   y += 38;
   if (scope) {
     doc.setFontSize(12);
     doc.setTextColor(...COLORS.darkBrown);
     doc.text('Scope of Work', pageW - margin, y, { align: 'right' });
     y += 8;


     doc.setFontSize(10);
     doc.setTextColor(...COLORS.dark);
     const lines = doc.splitTextToSize(scope, contentW - 10);
     lines.forEach((line) => {
       if (y > pageH - 40) {
         doc.addPage();
         y = margin;
       }
       doc.text(line, pageW - margin, y, { align: 'right' });
       y += 6;
     });
   }


   // --- Footer ---
   const footerY = pageH - 20;
   doc.setFillColor(...COLORS.brown);
   doc.rect(0, footerY - 5, pageW, 25, 'F');
   doc.setTextColor(...COLORS.cream);
   doc.setFontSize(9);
   doc.text('Michal Wolberger | Interior Design | 052-468-7812', pageW / 2, footerY + 4, { align: 'center' });
   doc.text('This proposal is valid for 14 days from the date above', pageW / 2, footerY + 10, { align: 'center' });


   // Convert to binary and upload
   const pdfBytes = doc.output('arraybuffer');
   const blob = new Blob([pdfBytes], { type: 'application/pdf' });
   const file = new File([blob], `quote_${client.name}_${Date.now()}.pdf`, { type: 'application/pdf' });


   const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });


   return Response.json({ success: true, file_url });
 } catch (error) {
   return Response.json({ error: error.message }, { status: 500 });
 }
});

