import React, { useRef, useState, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { base44 } from '@/api/base44Client';

export default function SignDocument() {
  const token = new URLSearchParams(window.location.search).get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [docData, setDocData] = useState(null);

  const [signerName, setSignerName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);

  // Load document info
  useEffect(() => {
    if (!token) { setError('missing_token'); setLoading(false); return; }
    base44.functions.invoke('getSignatureData', { token })
      .then(res => {
        // base44.functions.invoke returns the response body directly
        const data = res?.data || res;
        if (data?.error === 'already_signed') {
          setError('already_signed');
        } else if (data?.error) {
          setError(data.error);
        } else {
          setDocData(data);
        }
      })
      .catch(err => {
        const msg = err?.response?.data?.error || err?.message || 'unknown';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Canvas drawing helpers
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = useCallback((e) => {
    e.preventDefault();
    isDrawing.current = true;
    const canvas = canvasRef.current;
    const pos = getPos(e, canvas);
    lastPos.current = pos;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();
  }, []);

  const draw = useCallback((e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const pos = getPos(e, canvas);
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setHasSignature(true);
  }, []);

  const stopDraw = useCallback(() => { isDrawing.current = false; }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const generateCertificatePDF = async (signatureImageUrl) => {
    const signedAtDisplay = new Date().toLocaleString('he-IL');
    const name = signerName.trim();

    // Build certificate HTML
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:white;';
    div.innerHTML = `<div style="width:794px;min-height:1123px;background:#fff;font-family:Arial,'Arial Hebrew',sans-serif;direction:rtl;color:#1a1a1a;">
      <div style="background:#8B7355;padding:40px 50px;color:white;">
        <div style="font-size:28px;font-weight:700;">סטודיו מיכל וולברגר</div>
        <div style="font-size:14px;margin-top:4px;">אישור חתימה דיגיטלית</div>
      </div>
      <div style="padding:40px 50px;">
        <div style="text-align:right;margin-bottom:24px;line-height:2.2;font-size:15px;">
          <div><strong>מסמך:</strong> ${docData.name || 'מסמך לחתימה'}</div>
          <div><strong>חותם/ת:</strong> ${name}</div>
          <div><strong>תאריך:</strong> ${signedAtDisplay}</div>
          ${docData.client_name ? `<div><strong>לקוח:</strong> ${docData.client_name}</div>` : ''}
          ${docData.project_name ? `<div><strong>פרויקט:</strong> ${docData.project_name}</div>` : ''}
        </div>
        <div style="border-top:2px solid #C9A96E;padding-top:24px;margin-top:10px;">
          <div style="font-size:14px;font-weight:600;color:#8B7355;margin-bottom:12px;">חתימה:</div>
          <div style="background:#fafafa;border:1px solid #ddd;border-radius:8px;padding:10px;display:inline-block;">
            <img src="${signatureImageUrl}" style="max-width:300px;max-height:120px;" crossorigin="anonymous" />
          </div>
          <div style="font-size:13px;color:#666;margin-top:8px;">${name}</div>
        </div>
      </div>
      <div style="text-align:center;font-size:12px;color:#888;border-top:1px solid #eee;padding:16px 50px 0;position:absolute;bottom:30px;left:0;right:0;">
        Michal Wolberger Interior Design
      </div>
    </div>`;
    document.body.appendChild(div);

    try {
      // Wait for signature image to fully load before capturing
      const img = div.querySelector('img');
      if (img && !img.complete) {
        await new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
      }

      const canvas = await html2canvas(div.firstElementChild, { scale: 2, useCORS: true, logging: false });
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = (canvas.height * pageW) / canvas.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pageW, pageH);

      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], `certificate_${(docData.name || 'doc').replace(/\s/g, '_')}.pdf`, { type: 'application/pdf' });
      const { file_url: pdfUrl } = await base44.integrations.Core.UploadFile({ file: pdfFile });
      return pdfUrl;
    } finally {
      document.body.removeChild(div);
    }
  };

  const handleSubmit = async () => {
    if (!signerName.trim()) { alert('נא להזין שם מלא'); return; }
    if (!agreed) { alert('נא לאשר שקראת את המסמך'); return; }
    if (!hasSignature) { alert('נא לחתום בתיבת החתימה'); return; }

    setSubmitting(true);
    try {
      // 1. Upload signature image
      const canvas = canvasRef.current;
      const sigBase64 = canvas.toDataURL('image/png');
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], 'signature.png', { type: 'image/png' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // 2. Generate certificate PDF client-side using base64 signature (avoids CORS issues with html2canvas)
      const signedPdfUrl = await generateCertificatePDF(sigBase64);

      // 3. Single call to submitSignature with everything
      await base44.functions.invoke('submitSignature', {
        token,
        signer_name: signerName.trim(),
        signature_image_url: file_url,
        signed_pdf_url: signedPdfUrl,
      });
      setSuccess(true);
    } catch (e) {
      alert('שגיאה בשמירת החתימה: ' + (e.message || 'נסה שוב'));
    } finally {
      setSubmitting(false);
    }
  };

  // ---- LOADING ----
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF8F5' }}>
      <div style={{ textAlign: 'center', color: '#8B7355' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #8B7355', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p>טוען מסמך...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  // ---- ERROR ----
  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF8F5' }}>
      <div style={{ textAlign: 'center', padding: 32, maxWidth: 400 }}>
        {error === 'already_signed' ? (
          <>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
            <h2 style={{ color: '#8B7355' }}>המסמך כבר נחתם</h2>
            <p style={{ color: '#666' }}>החתימה התקבלה ונשמרה במערכת.</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 52, marginBottom: 16 }}>❌</div>
            <h2 style={{ color: '#c0392b' }}>
              {error === 'missing_token' ? 'קישור חסר' : error === 'not_found' ? 'מסמך לא נמצא' : 'שגיאה'}
            </h2>
            <p style={{ color: '#666' }}>נא לפנות לסטודיו מיכל וולברגר.</p>
          </>
        )}
      </div>
    </div>
  );

  // ---- SUCCESS ----
  if (success) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF8F5' }}>
      <div style={{ textAlign: 'center', padding: 32, maxWidth: 420, background: 'white', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>✍️</div>
        <h2 style={{ color: '#8B7355', marginBottom: 8 }}>החתימה בוצעה בהצלחה!</h2>
        <p style={{ color: '#555' }}>המסמך <strong>{docData?.name}</strong> נחתם.</p>
        <p style={{ color: '#888', fontSize: 14, marginTop: 8 }}>תודה, {signerName}!</p>
      </div>
    </div>
  );

  if (!docData) return null;

  // ---- MAIN FORM ----
  const s = {
    page: { minHeight: '100vh', background: '#FAF8F5', padding: '24px 16px', fontFamily: 'Assistant, Arial, sans-serif', direction: 'rtl' },
    card: { maxWidth: 540, margin: '0 auto', background: 'white', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden' },
    header: { background: '#8B7355', padding: '20px 24px', color: 'white' },
    body: { padding: 24 },
    label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, direction: 'rtl', boxSizing: 'border-box' },
    canvasWrap: { border: '2px solid #ddd', borderRadius: 10, overflow: 'hidden', background: '#fafafa', cursor: 'crosshair', touchAction: 'none' },
    btnPrimary: { width: '100%', padding: 13, background: submitting ? '#b0997c' : '#8B7355', color: 'white', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: submitting ? 'default' : 'pointer', marginTop: 16 },
    btnClear: { fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' },
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.header}>
          <p style={{ fontSize: 11, opacity: 0.7, margin: '0 0 4px' }}>Michal Wolberger Interior Design</p>
          <h1 style={{ margin: 0, fontSize: 20 }}>חתימה דיגיטלית</h1>
          <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: 14 }}>{docData.name}</p>
        </div>

        <div style={s.body}>
          {(docData.client_name || docData.project_name) && (
            <p style={{ fontSize: 13, color: '#888', margin: '0 0 20px' }}>
              {docData.client_name && <span>לקוח: <strong>{docData.client_name}</strong></span>}
              {docData.project_name && <span style={{ marginRight: 12 }}>פרויקט: <strong>{docData.project_name}</strong></span>}
            </p>
          )}

          {docData.file_url && (
            <div style={{ marginBottom: 20, padding: '12px 16px', background: '#FAF8F5', borderRadius: 8, border: '1px solid #e8e0d5' }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: '#555' }}>לפני החתימה, מומלץ לעיין במסמך:</p>
              <a href={docData.file_url} target="_blank" rel="noopener noreferrer"
                style={{ color: '#8B7355', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                📄 פתח את המסמך לצפייה ←
              </a>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={s.label}>שם מלא *</label>
            <input style={s.input} type="text" placeholder="הזן שם מלא"
              value={signerName} onChange={e => setSignerName(e.target.value)} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ ...s.label, margin: 0 }}>חתימה *</label>
              <button style={s.btnClear} onClick={clearCanvas}>נקה</button>
            </div>
            <div style={s.canvasWrap}>
              <canvas ref={canvasRef} width={500} height={160}
                style={{ width: '100%', height: 160, display: 'block' }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
            </div>
            {!hasSignature && (
              <p style={{ fontSize: 12, color: '#aaa', margin: '4px 0 0', textAlign: 'center' }}>חתום כאן עם העכבר / האצבע</p>
            )}
          </div>

          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <input type="checkbox" id="agree" checked={agreed} onChange={e => setAgreed(e.target.checked)}
              style={{ marginTop: 2, width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }} />
            <label htmlFor="agree" style={{ fontSize: 13, color: '#444', cursor: 'pointer', lineHeight: 1.5 }}>
              קראתי את המסמך <strong>{docData.name}</strong> ומסכים/ה לתוכנו.
            </label>
          </div>

          <button style={s.btnPrimary} onClick={handleSubmit} disabled={submitting}>
            {submitting ? '⏳ שומר חתימה...' : '✍️ חתום ואשר מסמך'}
          </button>

          <p style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 12 }}>
            החתימה הדיגיטלית מחייבת כחתימה על המסמך ותישמר במערכת.
          </p>
        </div>
      </div>
    </div>
  );
}