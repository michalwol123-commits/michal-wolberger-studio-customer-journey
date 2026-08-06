import React, { useRef, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import ArtIcon from '@/components/portal/ArtIcon';
import '@/components/portal/portal-theme.css';

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

  const handleSubmit = async () => {
    if (!signerName.trim()) { alert('נא להזין שם מלא'); return; }
    if (!agreed) { alert('נא לאשר שקראת את המסמך'); return; }
    if (!hasSignature) { alert('נא לחתום בתיבת החתימה'); return; }

    setSubmitting(true);
    try {
      // Upload signature image
      const canvas = canvasRef.current;
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], 'signature.png', { type: 'image/png' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Backend will embed the signature into the original PDF using pdf-lib
      await base44.functions.invoke('submitSignature', {
        token,
        signer_name: signerName.trim(),
        signature_image_url: file_url,
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
    <div className="portal-theme" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} dir="rtl">
      <div style={{ textAlign: 'center', color: '#8a7060' }}>
        <div style={{ width: 40, height: 40, border: '2px solid #e0d8ce', borderTopColor: '#2a1f18', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
        <p className="p-label">טוען מסמך...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  // ---- ERROR ----
  if (error) return (
    <div className="portal-theme" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} dir="rtl">
      <div className="p-card" style={{ textAlign: 'center', padding: 40, maxWidth: 420 }}>
        {error === 'already_signed' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><ArtIcon name="check" size={80} /></div>
            <h2 className="p-display" style={{ fontSize: 26, marginBottom: 8 }}>המסמך כבר נחתם</h2>
            <p style={{ color: '#8a7060' }}>החתימה התקבלה ונשמרה במערכת.</p>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><ArtIcon name="compass" size={80} /></div>
            <h2 className="p-display" style={{ fontSize: 26, marginBottom: 8 }}>
              {error === 'missing_token' ? 'קישור חסר' : error === 'not_found' ? 'מסמך לא נמצא' : 'שגיאה'}
            </h2>
            <p style={{ color: '#8a7060' }}>נא לפנות לסטודיו מיכל וולברגר.</p>
          </>
        )}
      </div>
    </div>
  );

  // ---- SUCCESS ----
  if (success) return (
    <div className="portal-theme" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} dir="rtl">
      <div className="p-card" style={{ textAlign: 'center', padding: 44, maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><ArtIcon name="pen" size={88} /></div>
        <h2 className="p-display" style={{ fontSize: 28, marginBottom: 10 }}>החתימה בוצעה בהצלחה!</h2>
        <p style={{ color: '#4a3728' }}>המסמך <strong>{docData?.name}</strong> נחתם.</p>
        <p style={{ color: '#8a7060', fontSize: 14, marginTop: 10 }}>תודה, {signerName}!</p>
      </div>
    </div>
  );

  if (!docData) return null;

  // ---- MAIN FORM ----
  const s = {
    page: { minHeight: '100vh', padding: '32px 16px', direction: 'rtl' },
    card: { maxWidth: 560, margin: '0 auto', background: '#fffdfa', border: '1px solid #e8e0d8', boxShadow: '0 4px 24px rgba(42,31,24,0.08)', overflow: 'hidden' },
    header: { background: '#2a1f18', padding: '28px 28px', color: '#f5f0eb' },
    body: { padding: 28 },
    label: { display: 'block', fontSize: 11, letterSpacing: 2, color: '#8a7060', marginBottom: 8 },
    input: { width: '100%', padding: '11px 14px', border: '1px solid #e0d8ce', borderRadius: 0, fontSize: 15, direction: 'rtl', boxSizing: 'border-box', background: '#fffdfa', color: '#2a1f18' },
    canvasWrap: { border: '1px solid #c8bdb2', overflow: 'hidden', background: '#f5f0eb', cursor: 'crosshair', touchAction: 'none' },
    btnClear: { fontSize: 12, color: '#8a7060', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' },
  };

  return (
    <div className="portal-theme" style={s.page}>
      <div style={s.card}>
        <div style={s.header}>
          <p className="p-label" style={{ color: '#c8bdb2', margin: '0 0 6px' }}>מיכל וולברגר · סטודיו לעיצוב פנים</p>
          <h1 className="p-display p-hero-title" style={{ margin: 0, fontSize: 26, color: '#f5f0eb' }}>חתימה דיגיטלית</h1>
          <p style={{ margin: '6px 0 0', color: 'rgba(245,240,235,0.8)', fontSize: 14 }}>{docData.name}</p>
        </div>

        <div style={s.body}>
          {(docData.client_name || docData.project_name) && (
            <p style={{ fontSize: 13, color: '#8a7060', margin: '0 0 22px' }}>
              {docData.client_name && <span>לקוח: <strong style={{ color: '#2a1f18' }}>{docData.client_name}</strong></span>}
              {docData.project_name && <span style={{ marginRight: 12 }}>פרויקט: <strong style={{ color: '#2a1f18' }}>{docData.project_name}</strong></span>}
            </p>
          )}

          {docData.file_url && (
            <div style={{ marginBottom: 22, padding: '14px 18px', background: '#f0ebe4', border: '1px solid #e0d8ce' }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: '#4a3728' }}>לפני החתימה, מומלץ לעיין במסמך:</p>
              <a href={docData.file_url} target="_blank" rel="noopener noreferrer"
                style={{ color: '#2a1f18', fontWeight: 600, fontSize: 14, textDecoration: 'underline' }}>
                פתח את המסמך לצפייה ←
              </a>
            </div>
          )}

          <div style={{ marginBottom: 22 }}>
            <label style={s.label}>שם מלא *</label>
            <input style={s.input} type="text" placeholder="הזן שם מלא"
              value={signerName} onChange={e => setSignerName(e.target.value)} />
          </div>

          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
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
              <p style={{ fontSize: 12, color: '#c8bdb2', margin: '6px 0 0', textAlign: 'center' }}>חתום כאן עם העכבר / האצבע</p>
            )}
          </div>

          <div style={{ marginBottom: 22, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <input type="checkbox" id="agree" checked={agreed} onChange={e => setAgreed(e.target.checked)}
              style={{ marginTop: 2, width: 16, height: 16, cursor: 'pointer', flexShrink: 0, accentColor: '#2a1f18' }} />
            <label htmlFor="agree" style={{ fontSize: 13, color: '#4a3728', cursor: 'pointer', lineHeight: 1.5 }}>
              קראתי את המסמך <strong>{docData.name}</strong> ומסכים/ה לתוכנו.
            </label>
          </div>

          <button className="p-btn" style={{ width: '100%', marginTop: 4 }} onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'שומר חתימה...' : 'חתום ואשר מסמך'} <span className="p-arrow">←</span>
          </button>

          <p style={{ fontSize: 11, color: '#c8bdb2', textAlign: 'center', marginTop: 14 }}>
            החתימה הדיגיטלית מחייבת כחתימה על המסמך ותישמר במערכת.
          </p>
        </div>
      </div>
    </div>
  );
}