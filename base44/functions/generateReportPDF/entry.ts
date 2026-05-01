// Generate Report PDF via PDFMonkey
// Receives report_type + data from frontend, builds HTML payload, sends to PDFMonkey
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildProjectsHTML(data) {
  const projects = data.projects || [];
  const clients = data.clients || [];
  const clientMap = {};
  clients.forEach(c => { clientMap[c.id] = c.name; });
  const active = projects.filter(p => p.status === 'active' || p.status === 'on_hold');

  let rows = active.map(p => `
    <tr>
      <td>${p.name}</td>
      <td>${clientMap[p.client_id] || '—'}</td>
      <td>${p.status === 'active' ? 'פעיל' : 'מוקפא'}</td>
      <td>שלב ${p.stage_current || 1}</td>
      <td>${p.progress || 0}%</td>
      <td>${p.total_budget ? '₪' + p.total_budget.toLocaleString() : '—'}</td>
    </tr>
  `).join('');

  return `
    <h2>דוח פרויקטים — סטודיו מיכל וולברגר</h2>
    <p>תאריך: ${new Date().toLocaleDateString('he-IL')}</p>
    <p>סה״כ פרויקטים פעילים: ${active.length}</p>
    <table>
      <thead><tr><th>פרויקט</th><th>לקוח</th><th>סטטוס</th><th>שלב</th><th>התקדמות</th><th>תקציב</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildFinancialHTML(data) {
  const payments = data.payments || [];
  const projects = data.projects || [];
  const projectMap = {};
  projects.forEach(p => { projectMap[p.id] = p.name; });

  const totalExpected = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + (p.amount_paid || 0), 0);
  const statusLabels = { pending: 'ממתין', partial: 'חלקי', paid: 'שולם', overdue: 'באיחור' };

  let rows = payments.map(p => `
    <tr>
      <td>${projectMap[p.project_id] || '—'}</td>
      <td>${p.milestone || '—'}</td>
      <td>₪${(p.amount || 0).toLocaleString()}</td>
      <td>₪${(p.amount_paid || 0).toLocaleString()}</td>
      <td>${p.due_date || '—'}</td>
      <td>${statusLabels[p.status] || p.status}</td>
    </tr>
  `).join('');

  return `
    <h2>דוח כספי — סטודיו מיכל וולברגר</h2>
    <p>תאריך: ${new Date().toLocaleDateString('he-IL')}</p>
    <p>סה״כ צפוי: ₪${totalExpected.toLocaleString()} | שולם: ₪${totalPaid.toLocaleString()}</p>
    <table>
      <thead><tr><th>פרויקט</th><th>אבן דרך</th><th>סכום</th><th>שולם</th><th>תאריך יעד</th><th>סטטוס</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildLeadsHTML(data) {
  const clients = data.clients || [];
  const leads = clients.filter(c => ['lead', 'qualified', 'proposal_sent'].includes(c.status));
  const converted = clients.filter(c => ['proposal_approved', 'active_client', 'completed_client'].includes(c.status));
  const sourceLabels = { facebook: 'פייסבוק', instagram: 'אינסטגרם', referral: 'הפניה', google: 'גוגל', website: 'אתר', whatsapp: 'וואטסאפ', other: 'אחר' };
  const statusLabels = { lead: 'ליד', qualified: 'מתעניין', proposal_sent: 'הצעה נשלחה' };

  let rows = leads.map(c => `
    <tr>
      <td>${c.name}</td>
      <td>${c.phone || '—'}</td>
      <td>${sourceLabels[c.source] || c.source || '—'}</td>
      <td>${statusLabels[c.status] || c.status}</td>
      <td>${c.estimated_budget ? '₪' + c.estimated_budget.toLocaleString() : '—'}</td>
    </tr>
  `).join('');

  return `
    <h2>דוח לידים — סטודיו מיכל וולברגר</h2>
    <p>תאריך: ${new Date().toLocaleDateString('he-IL')}</p>
    <p>סה״כ: ${clients.length} | לידים פעילים: ${leads.length} | המרה: ${clients.length > 0 ? Math.round((converted.length / clients.length) * 100) : 0}%</p>
    <table>
      <thead><tr><th>שם</th><th>טלפון</th><th>מקור</th><th>סטטוס</th><th>תקציב</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildSuppliersHTML(data) {
  const suppliers = data.suppliers || [];
  const projectSuppliers = data.projectSuppliers || [];
  const active = suppliers.filter(s => s.is_active !== false);
  const priceLabels = { low: 'נמוך', mid: 'בינוני', high: 'גבוה' };

  const supplierAgg = {};
  projectSuppliers.forEach(ps => {
    if (!supplierAgg[ps.supplier_id]) supplierAgg[ps.supplier_id] = { projects: 0, total: 0 };
    supplierAgg[ps.supplier_id].projects++;
    supplierAgg[ps.supplier_id].total += ps.agreed_amount || 0;
  });

  let rows = active.map(s => {
    const agg = supplierAgg[s.id] || { projects: 0, total: 0 };
    return `
      <tr>
        <td>${s.name}</td>
        <td>${s.category || '—'}</td>
        <td>${s.rating || '—'}</td>
        <td>${priceLabels[s.price_level] || '—'}</td>
        <td>${agg.projects}</td>
        <td>${agg.total > 0 ? '₪' + agg.total.toLocaleString() : '—'}</td>
      </tr>
    `;
  }).join('');

  return `
    <h2>דוח ספקים — סטודיו מיכל וולברגר</h2>
    <p>תאריך: ${new Date().toLocaleDateString('he-IL')}</p>
    <p>ספקים פעילים: ${active.length}</p>
    <table>
      <thead><tr><th>שם</th><th>קטגוריה</th><th>דירוג</th><th>רמת מחיר</th><th>פרויקטים</th><th>סכום מוסכם</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { report_type, data } = await req.json();

    const apiKey = Deno.env.get('PDFMONKEY_API_KEY');
    const templateId = Deno.env.get('PDFMONKEY_REPORT_TEMPLATE_ID');
    if (!apiKey || !templateId) {
      return Response.json({ error: 'PDFMonkey API key או Template ID לא הוגדרו. הגדירי אותם בהגדרות.' });
    }

    // Build HTML content based on report type
    let htmlContent = '';
    let title = '';
    switch (report_type) {
      case 'projects':
        htmlContent = buildProjectsHTML(data);
        title = 'דוח פרויקטים';
        break;
      case 'financial':
        htmlContent = buildFinancialHTML(data);
        title = 'דוח כספי';
        break;
      case 'leads':
        htmlContent = buildLeadsHTML(data);
        title = 'דוח לידים';
        break;
      case 'suppliers':
        htmlContent = buildSuppliersHTML(data);
        title = 'דוח ספקים';
        break;
      default:
        return Response.json({ error: 'סוג דוח לא מוכר' }, { status: 400 });
    }

    // Send to PDFMonkey
    const createRes = await fetch('https://api.pdfmonkey.io/api/v1/documents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document: {
          document_template_id: templateId,
          status: 'pending',
          payload: {
            title,
            html_content: htmlContent,
            date: new Date().toLocaleDateString('he-IL'),
            studio_name: 'סטודיו מיכל וולברגר',
          },
          meta: { source: 'michal_studio_reports', report_type },
        },
      }),
    });

    if (!createRes.ok) {
      const text = await createRes.text();
      return Response.json({ error: 'שגיאה ב-PDFMonkey', details: text }, { status: createRes.status });
    }

    const createJson = await createRes.json();
    const docId = createJson?.document?.id;
    if (!docId) return Response.json({ error: 'PDFMonkey לא החזיר document ID' }, { status: 500 });

    // Polling — up to 30 seconds
    let status = createJson?.document?.status;
    let downloadUrl = createJson?.document?.download_url ?? null;
    for (let i = 0; i < 15; i++) {
      if (status === 'success' && downloadUrl) break;
      if (status === 'failure') break;
      await sleep(2000);
      const pollRes = await fetch(`https://api.pdfmonkey.io/api/v1/documents/${docId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!pollRes.ok) break;
      const pollJson = await pollRes.json();
      status = pollJson?.document?.status;
      downloadUrl = pollJson?.document?.download_url ?? null;
    }

    return Response.json({ success: true, document_id: docId, status, download_url: downloadUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});