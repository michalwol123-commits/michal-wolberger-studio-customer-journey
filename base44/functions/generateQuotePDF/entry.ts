// Generate a styled PDF quote using 27 Canva background images + dynamic text overlays
// Pages: 27 total. Page 1 (cover, index 0) and page 24 (contract, index 23) get dynamic client text.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

const COVER_INDEX = 0;    // p-01.jpg — cover page
const CONTRACT_INDEX = 23; // p-24.jpg — "הסכם מתן שירותים"

// Helper: detect Hebrew chars in a string
function hasHebrew(str) {
  return /[\u0590-\u05FF]/.test(str);
}

// RTL-aware text placement: enables R2L for Hebrew, disables for Latin/numbers
function putText(doc, text, x, y, options) {
  const rtl = hasHebrew(text);
  doc.setR2L(rtl);
  doc.text(text, x, y, options || {});
  doc.setR2L(false);
}

// All 27 background page images in order
const PAGE_IMAGES = [
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/f09b4eea4_p-01.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/b94a89d56_p-02.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/c5b3ff4b0_p-03.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/4cdc5f1f3_p-04.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/51f2bece2_p-05.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/e10b9b31a_p-06.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/1c57c21a0_p-07.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/32b1b3df1_p-08.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/b219ceece_p-09.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/b14c13e3e_p-10.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/4daa96b52_p-11.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/7c2d46126_p-12.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/b9fa781dd_p-13.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/ef1f00041_p-14.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/adbbb37d5_p-15.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/bdd63fda7_p-16.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/dfb07220c_p-17.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/ed071e133_p-18.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/8ffe8d213_p-19.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/3af05f0d4_p-20.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/33be831d0_p-21.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/1cecaa474_p-22.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/053152709_p-23.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/bcccd9ce8_p-24.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/463816653_p-25.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/9b33cace9_p-26.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/4853b4a4e_p-27.jpg',
];

// Fetch image as base64 data URI for jsPDF
async function fetchImageBase64(url) {
  const resp = await fetch(url);
  const buf = await resp.arrayBuffer();
  const arr = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return 'data:image/jpeg;base64,' + btoa(binary);
}

// Fetch Heebo Hebrew font as base64
async function fetchHeeboFont() {
  const cssResp = await fetch(
    'https://fonts.googleapis.com/css2?family=Heebo:wght@400;700&subset=hebrew',
    { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }
  );
  const css = await cssResp.text();
  // Find .ttf URL for weight 400
  const urlMatch = css.match(/src:\s*url\(([^)]+\.ttf[^)]*)\)/);
  if (!urlMatch) return null;
  const ttfUrl = urlMatch[1].replace(/['"]/g, '');
  const fontResp = await fetch(ttfUrl);
  const fontBuf = await fontResp.arrayBuffer();
  const fontArr = new Uint8Array(fontBuf);
  let binary = '';
  for (let i = 0; i < fontArr.length; i++) {
    binary += String.fromCharCode(fontArr[i]);
  }
  return btoa(binary);
}

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

    console.log('Starting PDF generation for client:', client.name);

    // Load Hebrew font
    const heeboBase64 = await fetchHeeboFont();
    console.log('Font loaded:', !!heeboBase64);

    // Download all 27 background images in parallel
    console.log('Downloading 27 background images...');
    const imagePromises = PAGE_IMAGES.map(url => fetchImageBase64(url));
    const images = await Promise.all(imagePromises);
    console.log('All images downloaded');

    // Create PDF
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const pageH = 297;

    // Register Hebrew font
    if (heeboBase64) {
      doc.addFileToVFS('Heebo.ttf', heeboBase64);
      doc.addFont('Heebo.ttf', 'Heebo', 'normal');
    }

    // Build all 27 pages
    for (let i = 0; i < 27; i++) {
      if (i > 0) doc.addPage();

      // Add full-page background image
      doc.addImage(images[i], 'JPEG', 0, 0, pageW, pageH);

      // Set font for text overlays
      if (heeboBase64) doc.setFont('Heebo');

      // --- COVER (index 0, p-01.jpg): client name+city, date ---
      if (i === COVER_INDEX) {
        addCoverText(doc, client, pageW, pageH);
      }

      // --- CONTRACT (index 23, p-24.jpg "הסכם מתן שירותים"): client details + amount ---
      if (i === CONTRACT_INDEX) {
        addContractText(doc, client, total_amount, meeting_date, pageW, pageH);
      }
    }

    console.log('PDF pages built, converting to binary...');

    // Convert to binary and upload
    const pdfBytes = doc.output('arraybuffer');
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const file = new File([blob], `quote_${client.name}_${Date.now()}.pdf`, { type: 'application/pdf' });

    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    console.log('PDF uploaded:', file_url);

    // Update quote record with file_url if quote_id provided
    if (quote_id) {
      await base44.asServiceRole.entities.Quote.update(quote_id, { file_url });
    }

    return Response.json({ success: true, file_url });
  } catch (error) {
    console.error('generateQuotePDF error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// --- Cover page text overlay (index 0, p-01.jpg) ---
// Calibrated coords: center-aligned, bottom area
function addCoverText(doc, client, pageW, pageH) {
  doc.setTextColor(74, 53, 38);

  // Client name + city — single line, 12pt, center at (105, 260)
  doc.setFontSize(12);
  const nameLine = [client.name, client.address].filter(Boolean).join(', ');
  putText(doc, nameLine, 105, 260, { align: 'center' });

  // Date — 11pt, center at (105, 266)
  doc.setFontSize(11);
  const today = new Date();
  const dateStr = `${today.getDate()}.${today.getMonth() + 1}.${today.getFullYear()}`;
  putText(doc, dateStr, 105, 266, { align: 'center' });
}

// --- Contract page text overlay (index 23, p-24.jpg "הסכם מתן שירותים") ---
// All coords in mm on A4 (210×297), calibrated from Canva template
function addContractText(doc, client, totalAmount, meetingDate, pageW, pageH) {
  doc.setTextColor(58, 42, 30);

  const today = new Date();
  const dayStr = String(today.getDate());
  const monthStr = String(today.getMonth() + 1);
  const yearStr = String(today.getFullYear());

  // "שנחתם ביום __ לחודש __ שנת __" — top line
  doc.setFontSize(11);
  putText(doc, dayStr, 116.6, 48, { align: 'center' });
  putText(doc, monthStr, 143.9, 48, { align: 'center' });
  putText(doc, yearStr, 171.2, 48, { align: 'center' });

  // שם מלא — right-aligned at x=168, y=115
  doc.setFontSize(13);
  putText(doc, client.name || '', 168, 115, { align: 'right' });

  // ת.ז — right-aligned at x=172.2, y=121.5
  putText(doc, client.id_number || '', 172.2, 121.5, { align: 'right' });

  // כתובת + טלפון — right-aligned at x=193.2, y=135
  doc.setFontSize(12);
  const contactStr = [client.address, client.phone].filter(Boolean).join(' | ');
  putText(doc, contactStr, 193.2, 135, { align: 'right' });

  // דוא"ל — right-aligned at x=163.8, y=147
  putText(doc, client.email || '', 163.8, 147, { align: 'right' });

  // סכום — center at x=82, y=211
  const amountStr = totalAmount ? Number(totalAmount).toLocaleString('he-IL') : '';
  putText(doc, amountStr, 82, 211, { align: 'center' });

  // תאריך הצעת מחיר — center at x=46, y=227
  if (meetingDate) {
    const md = new Date(meetingDate);
    const mdStr = `${md.getDate()}.${md.getMonth() + 1}.${md.getFullYear()}`;
    doc.setFontSize(11);
    putText(doc, mdStr, 46, 227, { align: 'center' });
  }
}