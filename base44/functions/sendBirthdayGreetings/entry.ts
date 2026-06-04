// Birthday & Anniversary Greetings Automation
// Trigger: Scheduled daily at 09:00 Israel time
// Sends WhatsApp (Green API) + Email (Brevo) greetings
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    const todayStr = `${today.getFullYear()}-${String(todayMonth).padStart(2,'0')}-${String(todayDay).padStart(2,'0')}`;

    const clients = await base44.asServiceRole.entities.Client.list('-created_date', 500);

    let birthdaySent = 0;
    let anniversarySent = 0;
    let skipped = 0;

    for (const client of clients) {
      if (!client.phone && !client.email) { skipped++; continue; }

      // ===== יום הולדת =====
      if (client.birthday) {
        const bd = new Date(client.birthday);
        if (bd.getMonth() + 1 === todayMonth && bd.getDate() === todayDay) {
          // בדיקת כפילויות
          const existing = await base44.asServiceRole.entities.Communication.filter({ client_id: client.id, subject: 'יום הולדת שמח' });
          const alreadySentToday = existing.some(c => c.created_date && c.created_date.startsWith(todayStr));
          if (alreadySentToday) { skipped++; continue; }

          const bdMsg = `היי ${client.name} 🎂\nיום הולדת שמח! 🎉\nמאחלים לך יום מלא שמחה, אהבה ורגעים מיוחדים.\n\nבחיבה,\nמיכל וולברגר ✨`;

          // WhatsApp דרך Green API
          if (client.phone) {
            const waSent = await sendWhatsAppGreen(client.phone, bdMsg);
            await base44.asServiceRole.entities.Communication.create({
              client_id: client.id, type: 'whatsapp', direction: 'outbound',
              subject: 'יום הולדת שמח', content: bdMsg,
              sent_by: 'system', status: waSent ? 'sent' : 'failed', channel: 'base44_native',
            });
          }

          // מייל דרך Brevo
          if (client.email) {
            const emailSent = await sendBrevoEmail(
              client.email,
              client.name,
              '🎂 יום הולדת שמח!',
              buildBirthdayHtml(client.name)
            );
            await base44.asServiceRole.entities.Communication.create({
              client_id: client.id, type: 'email', direction: 'outbound',
              subject: '🎂 יום הולדת שמח!',
              content: buildBirthdayHtml(client.name),
              sent_by: 'system', status: emailSent ? 'sent' : 'failed', channel: 'base44_native',
            });
          }
          birthdaySent++;
        }
      }

      // ===== יום נישואים =====
      if (client.anniversary) {
        const ann = new Date(client.anniversary);
        if (ann.getMonth() + 1 === todayMonth && ann.getDate() === todayDay) {
          const existing = await base44.asServiceRole.entities.Communication.filter({ client_id: client.id, subject: 'יום נישואים שמח' });
          const alreadySentToday = existing.some(c => c.created_date && c.created_date.startsWith(todayStr));
          if (alreadySentToday) { skipped++; continue; }

          const annMsg = `היי ${client.name} 💍\nיום נישואים שמח! 💕\nמאחלים לכם אהבה, אושר ועוד שנים רבות ויפות יחד.\n\nבחיבה,\nמיכל וולברגר ✨`;

          if (client.phone) {
            const waSent = await sendWhatsAppGreen(client.phone, annMsg);
            await base44.asServiceRole.entities.Communication.create({
              client_id: client.id, type: 'whatsapp', direction: 'outbound',
              subject: 'יום נישואים שמח', content: annMsg,
              sent_by: 'system', status: waSent ? 'sent' : 'failed', channel: 'base44_native',
            });
          }

          if (client.email) {
            const emailSent = await sendBrevoEmail(
              client.email,
              client.name,
              '💍 יום נישואים שמח!',
              buildAnniversaryHtml(client.name)
            );
            await base44.asServiceRole.entities.Communication.create({
              client_id: client.id, type: 'email', direction: 'outbound',
              subject: '💍 יום נישואים שמח!',
              content: buildAnniversaryHtml(client.name),
              sent_by: 'system', status: emailSent ? 'sent' : 'failed', channel: 'base44_native',
            });
          }
          anniversarySent++;
        }
      }
    }

    console.log(`✅ Done: ${birthdaySent} birthday, ${anniversarySent} anniversary, ${skipped} skipped`);
    return Response.json({ success: true, today: todayStr, birthdaySent, anniversarySent, skipped, total: birthdaySent + anniversarySent });
  } catch (error) {
    console.error('❌ Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// =============================================
// Green API — שליחת WhatsApp
// =============================================
function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/[\s\-\.\(\)\+]/g, '');
}

async function sendWhatsAppGreen(phone, message) {
  const GREEN_ID = Deno.env.get('GREEN_ID');
  const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');
  if (!GREEN_ID || !GREEN_TOKEN) {
    console.log('⚠️ Green API not configured — skipping WhatsApp');
    return false;
  }

  let normalized = normalizePhone(phone);
  if (normalized.startsWith('0')) normalized = '972' + normalized.substring(1);
  const chatId = normalized + '@c.us';

  const url = `https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message })
    });
    const result = await resp.json();
    if (resp.ok && result.idMessage) {
      console.log(`✅ WhatsApp sent to ${chatId}: ${result.idMessage}`);
      return true;
    }
    console.log(`❌ WhatsApp failed:`, result);
    return false;
  } catch (e) {
    console.error('❌ WhatsApp error:', e.message);
    return false;
  }
}

// =============================================
// Brevo — שליחת מייל
// =============================================
async function sendBrevoEmail(toEmail, toName, subject, htmlContent) {
  const apiKey = Deno.env.get('BREVO_API_KEY');
  if (!apiKey) {
    console.log('⚠️ Brevo API key not configured — skipping email');
    return false;
  }

  try {
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'סטודיו מיכל וולברגר', email: 'studio@michalwolberger.com' },
        to: [{ email: toEmail, name: toName || '' }],
        subject,
        htmlContent,
      }),
    });
    if (resp.ok) {
      console.log(`✅ Email sent to ${toEmail}`);
      return true;
    }
    const err = await resp.text();
    console.log(`❌ Email failed: ${err}`);
    return false;
  } catch (e) {
    console.error('❌ Email error:', e.message);
    return false;
  }
}

// =============================================
// HTML Templates
// =============================================
function buildBirthdayHtml(name) {
  return `<div dir="rtl" style="font-family:Arial,sans-serif;padding:20px;max-width:520px;">
    <div style="background:#8B7355;padding:16px 24px;border-radius:8px 8px 0 0;">
      <h2 style="color:white;margin:0;font-size:20px;">🎂 יום הולדת שמח!</h2>
    </div>
    <div style="background:white;padding:24px;border:1px solid #e8e0d5;border-top:none;border-radius:0 0 8px 8px;">
      <p style="color:#333;font-size:16px;">היי ${name},</p>
      <p style="color:#333;line-height:1.6;">יום הולדת שמח! 🎉<br/>מאחלים לך יום מלא שמחה, אהבה ורגעים מיוחדים.</p>
      <p style="color:#8B7355;font-style:italic;margin-top:24px;">בחיבה,<br/><strong>מיכל וולברגר</strong> ✨<br/>סטודיו מיכל וולברגר לעיצוב פנים</p>
    </div>
  </div>`;
}

function buildAnniversaryHtml(name) {
  return `<div dir="rtl" style="font-family:Arial,sans-serif;padding:20px;max-width:520px;">
    <div style="background:#8B7355;padding:16px 24px;border-radius:8px 8px 0 0;">
      <h2 style="color:white;margin:0;font-size:20px;">💍 יום נישואים שמח!</h2>
    </div>
    <div style="background:white;padding:24px;border:1px solid #e8e0d5;border-top:none;border-radius:0 0 8px 8px;">
      <p style="color:#333;font-size:16px;">היי ${name},</p>
      <p style="color:#333;line-height:1.6;">יום נישואים שמח! 💕<br/>מאחלים לכם אהבה, אושר ועוד שנים רבות ויפות יחד.</p>
      <p style="color:#8B7355;font-style:italic;margin-top:24px;">בחיבה,<br/><strong>מיכל וולברגר</strong> ✨<br/>סטודיו מיכל וולברגר לעיצוב פנים</p>
    </div>
  </div>`;
}