// Generate the full quote+contract PDF for Michal Wolberger Interior Design.
// Supports `part`: 'full' (default, all 27 pages), 'quote' (pages 1-23), 'contract' (pages 24-27).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

const B = 'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/';
const PAGE_IMAGES = [
  B + 'c68651c3f_p-01.jpg', // 0  cover (dynamic)
  B + 'c04dac11b_p-02.jpg', // 1
  B + 'd9baae647_p-03.jpg', // 2
  B + 'c0287a4d6_p-04.jpg', // 3
  B + '883a904ed_p-05.jpg', // 4
  B + 'c79f5ebb1_p-06.jpg', // 5
  B + '218b9de44_p-07.jpg', // 6
  B + '125b5cf35_p-08.jpg', // 7
  B + 'a64363a35_p-09.jpg', // 8
  B + 'a3ce1e1fb_p-10.jpg', // 9
  B + '4daa96b52_p-11.jpg', // 10
  B + '7c2d46126_p-12.jpg', // 11
  B + 'b9fa781dd_p-13.jpg', // 12
  'https://media.base44.com/images/public/69e4e3a98f5f3e4e5bd49dba/d23b47ae7_15.png', // 13 comparison table (dynamic)
  B + 'bdd63fda7_p-16.jpg', // 14 investment / prices (dynamic)
  B + 'dfb07220c_p-17.jpg', // 16
  B + 'ed071e133_p-18.jpg', // 17
  B + '8ffe8d213_p-19.jpg', // 18
  B + '3af05f0d4_p-20.jpg', // 19
  B + '33be831d0_p-21.jpg', // 20
  B + '1cecaa474_p-22.jpg', // 21
  B + '053152709_p-23.jpg', // 22
  B + '498d8d078_24.jpg', // 23 contract (dynamic) — Canva date line removed, overlaid in code
  B + '463816653_p-25.jpg', // 24
  B + '9b33cace9_p-26.jpg', // 25
  B + '4853b4a4e_p-27.jpg', // 26
];

const COVER_INDEX = 0;
const P15_INDEX = 13;
const P16_INDEX = 14;
const CONTRACT_INDEX = 22;

// page ranges per part (inclusive, 0-based indices)
const RANGES = { full: [0, 25], quote: [0, 21], contract: [22, 25] };

// Hebrew weekday letters for the contract signing line ("שנחתם ביום ___")
const WEEKDAYS_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'שבת'];

const CMP_COL_X = { s: 30, m: 80, l: 130 };
const CMP_ROWS = [
  ['renders', 69],
  ['materials', 90],
  ['bathrooms', 114],
  ['project_mgmt', 144],
  ['cloud', 167],
  ['budget', 190],
  ['install_days', 207],
  ['styling', 224],
  ['shopping', 261],
];

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

    const { client_id, quote_id, total_amount, meeting_date, signDate, part } = await req.json();
    const [PART_START, PART_END] = RANGES[part] || RANGES.full;

    const clients = await base44.asServiceRole.entities.Client.filter({ id: client_id });
    if (clients.length === 0) return Response.json({ error: 'Client not found' }, { status: 404 });
    const client = clients[0];

    let quote = null;
    if (quote_id) {
      const quotes = await base44.asServiceRole.entities.Quote.filter({ id: quote_id });
      quote = quotes[0] || null;
    }

    if (PAGE_IMAGES.length !== 26) {
      return Response.json({ error: `PAGE_IMAGES must have exactly 26 URLs in order (p-01..p-13, p-15..p-27). Got ${PAGE_IMAGES.length}.` }, { status: 500 });
    }

    const heeboBase64 = await fetchBase64(HEEBO_TTF_URL).catch((e) => { console.error('Heebo fetch failed:', e); return ''; });

    // fetch only the pages in the chosen range, keeping index alignment
    const pageImages = new Array(PAGE_IMAGES.length).fill('');
    const failed = [];
    for (let i = PART_START; i <= PART_END; i++) {
      try {
        const b64 = await fetchBase64(PAGE_IMAGES[i]);
        if (!b64 || b64.length < 100) throw new Error(`empty/too small (${b64.length} chars)`);
        pageImages[i] = b64;
      } catch (e) {
        console.error(`img ${i + 1}/26 FAILED — ${PAGE_IMAGES[i]} — ${e.message}`);
        failed.push(`#${i + 1}: ${PAGE_IMAGES[i]} (${e.message})`);
      }
    }
    if (failed.length) {
      return Response.json({ error: `Image load failed for ${failed.length} page(s):\n${failed.join('\n')}` }, { status: 500 });
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    if (heeboBase64) {
      doc.addFileToVFS('Heebo.ttf', heeboBase64);
      doc.addFont('Heebo.ttf', 'Heebo', 'normal');
      doc.setFont('Heebo');
    }
    const W = 210, H = 297;

    // RTL bracket mirroring: jsPDF does NOT mirror paired punctuation under R2L.
    const MIRROR = { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<' };
    const fixRtl = (s) => s.replace(/[()\[\]{}<>]/g, (c) => MIRROR[c] ?? c);

    const put = (txt, x, y, align, size) => {
      const t = String(txt ?? '');
      if (!t) return;
      doc.setFontSize(size);
      const rtl = HEB.test(t);
      doc.setR2L(rtl);
      doc.text(rtl ? fixRtl(t) : t, x, y, { align });
      doc.setR2L(false);
    };

    const today = new Date();
    const coverDate = today.toLocaleDateString('he-IL');
    // short date d.m.yy — matches the contract template style (e.g. 25.5.26)
    const shortDate = (d) => `${d.getDate()}.${d.getMonth() + 1}.${String(d.getFullYear()).slice(-2)}`;
    const quoteDate = meeting_date ? shortDate(new Date(meeting_date)) : shortDate(today);
    // amount: blank (not "0") when there is no real amount yet (quote stage)
    const amountStr = (total_amount != null && Number(total_amount) > 0) ? Number(total_amount).toLocaleString('he-IL') : '';
    const city = client.city || '';
    const coverLine = city ? `${client.name || ''}, ${city}` : (client.name || '');
    const addressLine = [client.address, city].filter(Boolean).join(', ');
    const money = (v) => (v != null && v !== '' ? Number(v).toLocaleString('he-IL') : '');
    const priceS = money(quote?.price_small);
    const priceM = money(quote?.price_medium);
    const priceL = money(quote?.price_large);

    // --- Contract field overrides (empty in quote => fall back to client card) ---
    const cName    = quote?.contract_name      || client.name      || '';
    const cId      = quote?.contract_id_number || client.id_number || '';
    const cPhone   = quote?.contract_phone     || client.phone     || '';
    const cAddress = quote?.contract_address   || addressLine      || '';
    const cEmail   = quote?.contract_email     || client.email     || '';
    // contract date: explicit contract_date, else signDate, else today
    const contractD = quote?.contract_date
      ? new Date(quote.contract_date)
      : (signDate ? new Date(signDate) : today);

    let comparison = {};
    if (quote?.comparison) {
      comparison = typeof quote.comparison === 'string'
        ? (() => { try { return JSON.parse(quote.comparison); } catch { return {}; } })()
        : quote.comparison;
    }

    let _drawn = 0;
    for (let i = PART_START; i <= PART_END; i++) {
      if (_drawn > 0) doc.addPage();
      _drawn++;
      doc.addImage(pageImages[i], 'JPEG', 0, 0, W, H);

      if (i === COVER_INDEX) {
        doc.setTextColor(74, 53, 38);
        put(coverLine, W / 2, 260, 'center', 12);
        put(coverDate, W / 2, 266, 'center', 11);
        // diagnostic stamp — confirms the new code is live.
        doc.setTextColor(200, 0, 0);
        put('v8', 8, 8, 'left', 8);
      }

      if (i === P15_INDEX) {
        doc.setTextColor(40, 40, 40);
        const isCheck = (v) => {
          const s = String(v ?? '').trim().toLowerCase();
          return s === '\u2713' || s === '\u2714' || s === 'v' || s === 'true' || s === 'כן';
        };
        const drawCheck = (cx, cy) => {
          doc.setDrawColor(40, 40, 40);
          doc.setLineWidth(0.6);
          doc.line(cx - 2, cy - 0.2, cx - 0.6, cy + 1.5);
          doc.line(cx - 0.6, cy + 1.5, cx + 2.4, cy - 2.4);
        };
        for (const [key, y] of CMP_ROWS) {
          const cell = comparison[key] || {};
          for (const col of ['s', 'm', 'l']) {
            const val = cell[col];
            if (val == null || String(val).trim() === '') continue;
            const x = CMP_COL_X[col];
            if (isCheck(val)) {
              drawCheck(x, y - 1);
            } else {
              doc.setFontSize(9);
              const rtl = HEB.test(String(val));
              doc.setR2L(rtl);
              const lines = doc.splitTextToSize(rtl ? fixRtl(String(val)) : String(val), 40);
              const lh = 3.8;
              let yy = y - ((lines.length - 1) * lh) / 2;
              for (const ln of lines) { doc.text(ln, x, yy, { align: 'center' }); yy += lh; }
              doc.setR2L(false);
            }
          }
        }
      }

      if (i === P16_INDEX) {
        doc.setTextColor(58, 42, 30);
        put(priceS, 31, 80, 'center', 16);
        put(priceM, 82, 80, 'center', 16);
        put(priceL, 130, 80, 'center', 16);

        // ===== קופסת הערות אופציונלית מתחת למחירים =====
        const notesText = (quote?.scope || '').trim();
        if (notesText) {
          // קופסה רכה בצבעי המסמך
          doc.setDrawColor(196, 175, 156);
          doc.setFillColor(252, 249, 244);
          doc.setLineWidth(0.4);
          doc.roundedRect(20, 110, 170, 90, 3, 3, 'FD');

          // כותרת "הערות"
          doc.setTextColor(120, 95, 70);
          put('הערות', 185, 120, 'right', 11);

          // טקסט ההערות עצמן — split אוטומטי לשורות, מקסימום 14 שורות
          doc.setTextColor(58, 42, 30);
          doc.setFontSize(10);
          doc.setR2L(true);
          const lines = doc.splitTextToSize(fixRtl(notesText), 160);
          let yy = 130;
          const lh = 5;
          for (const ln of lines.slice(0, 14)) {
            doc.text(ln, 185, yy, { align: 'right' });
            yy += lh;
          }
          doc.setR2L(false);
        }
      }

      if (i === CONTRACT_INDEX) {
        doc.setTextColor(58, 42, 30);
        put(cName, 130, 105.2, 'right', 13);
        put(cId, 138, 114.4, 'right', 13);
        put(cPhone, 139, 123.7, 'right', 12);
        put(cAddress, 132, 133, 'right', 12);
        put(cEmail, 140, 142.3, 'right', 12);
        // total amount — sits on the "סך ____" underline
        put(amountStr, 53, 207, 'center', 12);
        // signing date — full sentence overlaid (line removed from the Canva template), centered below title
        const signLine = `שנחתם ביום ${WEEKDAYS_HE[contractD.getDay()]} לחודש ${contractD.getMonth() + 1} שנת ${String(contractD.getFullYear()).slice(-2)}`;
        put(signLine, 105, 49, 'center', 13);
        // "על בסיס הצעת מחיר מיום ___": template has a baked-in date — mask it, then print the real quote date
        doc.setFillColor(196, 175, 156);
        doc.rect(19, 221, 25, 8, 'F');
        doc.setTextColor(58, 42, 30);
        put(quoteDate, 32, 226.5, 'center', 11);
      }
    }

    const pdfBytes = doc.output('arraybuffer');
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const file = new File([blob], `quote_${client.name}_${Date.now()}.pdf`, { type: 'application/pdf' });
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    return Response.json({ success: true, file_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});