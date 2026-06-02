// Generate the quote+contract PDF for Michal Wolberger Interior Design.
// 27 Canva pages as background JPEGs + transparent text overlay on the 2 dynamic
// pages only — cover (index 0) and contract (index 23). Only client data is overlaid.
// RTL: jsPDF reverses pure-LTR under setR2L(true) and pure-Hebrew under setR2L(false).
// Fix = toggle R2L PER STRING by Hebrew presence (see put()). Coordinates are calibrated — do NOT change.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

// 27 URLs in order. Index 0 = p-01 (cover), Index 23 = p-24 (contract "הסכם מתן שירותים").
const PAGE_IMAGES = [
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/c68651c3f_p-01.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/c04dac11b_p-02.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/d9baae647_p-03.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/c0287a4d6_p-04.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/883a904ed_p-05.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/c79f5ebb1_p-06.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/218b9de44_p-07.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/125b5cf35_p-08.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/a64363a35_p-09.jpg',
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/a3ce1e1fb_p-10.jpg',
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

const COVER_INDEX = 0;     // p-01.jpg
const P16_INDEX = 15;      // p-16.jpg — 3 package prices
const CONTRACT_INDEX = 23; // p-24.jpg "הסכם מתן שירותים"
const HEB = /[\u0590-\u05FF]/;
const HEEBO_TTF_URL = 'https://github.com/google/fonts/raw/main/ofl/heebo/Heebo%5Bwght%5D.ttf';

async function fetchBase64(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`fetch failed ${resp.status} ${url}`);
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
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { client_id, quote_id, total_amount, meeting_date, signDate } = await req.json();

    const clients = await base44.asServiceRole.entities.Client.filter({ id: client_id });
    if (clients.length === 0) return Response.json({ error: 'Client not found' }, { status: 404 });
    const client = clients[0];

    // Fetch quote record for package prices
    let quote = null;
    if (quote_id) {
      const quotes = await base44.asServiceRole.entities.Quote.filter({ id: quote_id });
      quote = quotes[0] || null;
    }

    if (PAGE_IMAGES.length !== 27) {
      return Response.json({ error: `PAGE_IMAGES must have exactly 27 URLs (p-01..p-27). Got ${PAGE_IMAGES.length}.` }, { status: 500 });
    }

    console.log('Starting PDF generation for client:', client.name);

    const heeboBase64 = await fetchBase64(HEEBO_TTF_URL).catch((e) => { console.error('Heebo fetch failed:', e); return ''; });
    console.log('Font loaded:', !!heeboBase64);

    // Load images SEQUENTIALLY with per-image logging — a bad URL surfaces as a clear error, never a blank page.
    const pageImages = [];
    const failed = [];
    for (let i = 0; i < PAGE_IMAGES.length; i++) {
      try {
        const b64 = await fetchBase64(PAGE_IMAGES[i]);
        if (!b64 || b64.length < 100) throw new Error(`empty/too small (${b64.length} chars)`);
        console.log(`img ${i + 1}/27 ok — ${b64.length} chars`);
        pageImages.push(b64);
      } catch (e) {
        console.error(`img ${i + 1}/27 FAILED — ${PAGE_IMAGES[i]} — ${e.message}`);
        failed.push(`#${i + 1}: ${PAGE_IMAGES[i]} (${e.message})`);
        pageImages.push('');
      }
    }
    if (failed.length) {
      return Response.json({ error: `Image load failed for ${failed.length}/27:\n${failed.join('\n')}` }, { status: 500 });
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    if (heeboBase64) {
      doc.addFileToVFS('Heebo.ttf', heeboBase64);
      doc.addFont('Heebo.ttf', 'Heebo', 'normal');
      doc.setFont('Heebo');
    }
    const W = 210, H = 297;

    // RTL-aware text placement: enables R2L for Hebrew, disables for Latin/numbers
    const put = (txt, x, y, align, size) => {
      const t = String(txt ?? '');
      if (!t) return;
      doc.setFontSize(size);
      doc.setR2L(HEB.test(t));
      doc.text(t, x, y, { align });
      doc.setR2L(false);
    };

    const today = new Date();
    const dd = String(today.getDate());
    const mm = String(today.getMonth() + 1);
    const yyyy = String(today.getFullYear());
    const coverDate = today.toLocaleDateString('he-IL');
    const quoteDate = meeting_date ? new Date(meeting_date).toLocaleDateString('he-IL') : coverDate;
    const amountStr = total_amount != null ? Number(total_amount).toLocaleString('he-IL') : '';
    const city = client.city || '';
    const coverLine = city ? `${client.name || ''}, ${city}` : (client.name || '');
    const addressLine = [client.address, city].filter(Boolean).join(', ');

    const money = (v) => (v != null && v !== '' ? Number(v).toLocaleString('he-IL') : '');
    const priceS = money(quote?.price_small);
    const priceM = money(quote?.price_medium);
    const priceL = money(quote?.price_large);

    for (let i = 0; i < pageImages.length; i++) {
      if (i > 0) doc.addPage();
      doc.addImage(pageImages[i], 'JPEG', 0, 0, W, H);

      // --- COVER (index 0, p-01.jpg): client name+city, date ---
      if (i === COVER_INDEX) {
        doc.setTextColor(74, 53, 38);
        put(coverLine, W / 2, 260, 'center', 12);
        put(coverDate, W / 2, 266, 'center', 11);
      }

      // --- P16 (index 15, p-16.jpg): 3 package prices ---
      if (i === P16_INDEX) {
        doc.setTextColor(58, 42, 30);
        put(priceS, 31, 80, 'center', 16);   // left box = S
        put(priceM, 82, 80, 'center', 16);   // middle = M
        put(priceL, 130, 80, 'center', 16);  // right = L
      }

      // --- CONTRACT (index 23, p-24.jpg "הסכם מתן שירותים"): all client details ---
      if (i === CONTRACT_INDEX) {
        doc.setTextColor(58, 42, 30);
        put(client.name, 130, 104, 'right', 13);
        put(client.id_number, 138, 112, 'right', 13);
        put(client.phone, 139, 120, 'right', 12);
        put(addressLine, 138, 132, 'right', 12);
        put(client.email, 140, 140, 'right', 12);
        put(amountStr, 62, 206, 'center', 12);
        put(quoteDate, 35, 224, 'center', 11);
        // signing date — only rendered when signDate is provided
        if (signDate) {
          const d = new Date(signDate);
          put(String(d.getDate()), 120, 50, 'center', 11);
          put(String(d.getMonth() + 1), 92, 50, 'center', 11);
          put(String(d.getFullYear()), 68, 50, 'center', 11);
        }
      }
    }

    console.log('PDF pages built, converting to binary...');

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