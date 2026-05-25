import React, { useRef, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export default function SignDocument() {
  const token = new URLSearchParams(window.location.search).get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [docData, setDocData] = useState(null);
  const [alreadySigned, setAlreadySigned] = useState(null);

  const [signerName, setSignerName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [hasSignature, setHasSignature] = useState(false);

  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);

  // Load document info
  useEffect(() => {
    if (!token) { setError('קישור לא תקין'); setLoading(false); return; }
    base44.functions.invoke('getSignatureData', { token })
      .then(res => {
        if (res.already_signed) setAlreadySigned(res);
        else setDocData(res);
      })
      .catch(e => setError(e.message || 'שגיאה בטעינת המסמך'))
      .finally(() => setLoading(false));
  }, [token]);

  // Canvas setup
  useEffect(() => {
    if (!docData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [docData]);

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
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = async () => {
    if (!signerName.trim()) { alert('נא להזין שם מלא'); return; }
    if (!agreed) { alert('נא לאשר שקראת את המסמך'); return; }
    if (!hasSignature) { alert('נא לחתום בתיבת החתימה'); return; }

    setSubmitting(true);
    try {
      const canvas = canvasRef.current;
      const signatureImage = canvas.toDataURL('image/png');
      const res = await base44.functions.invoke('submitSignature', {
        token,
        signer_name: signerName.trim(),
        signature_image: signatureImage,
      });
      setSuccess(res);
    } catch (e) {
      alert('שגיאה בשמירת החתימה: ' + (e.message || 'נסה שוב'));
    } finally {
      setSubmitting(false);
    }
  };

  // ---- LOADING ----
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAF8F5' }}>
      <div style={{ textAlign: 'center', color: '#8B7355' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #8B7355', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p>טוען מסמך...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  // ---- ERROR ----
  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAF8F5' }}>
      <div style={{ textAlign: 'center', padding: 32, maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
        <h2 style={{ color: '#c0392b', marginBottom: 8 }}>שגיאה</h2>
        <p style={{ color: '#666' }}>{error}</p>
      </div>
    </div>
  );

  // ---- ALREADY SIGNED ----
  if (alreadySigned) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAF8F5' }}>
      <div style={{ textAlign: 'center', padding: 32, maxWidth: 420, background: 'white', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: '#8B7355', marginBottom: 8 }}>המסמך כבר נחתם</h2>
        <p style={{ color: '#555', marginBottom: 4 }}><strong>{alreadySigned.doc_name}</strong></p>
        <p style={{ color: '#888', fontSize: 14 }}>
          נחתם על-ידי {alreadySigned.signed_by_name} ב-{new Date(alreadySigned.signed_at).toLocaleDateString('he-IL')}
        </p>
        {alreadySigned.signed_pdf_url && (
          <a href={alreadySigned.signed_pdf_url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-block', marginTop: 20, background: '#8B7355', color: 'white', padding: '10px 24px', borderRadius: 8, textDecoration: 'none', fontSize: 14 }}>
            צפה ב-PDF החתום
          </a>
        )}
      </div>
    </div>
  );

  // ---- SUCCESS ----
  if (success) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAF8F5' }}>
      <div style={{ textAlign: 'center', padding: 32, maxWidth: 420, background: 'white', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>✍️</div>
        <h2 style={{ color: '#8B7355', marginBottom: 8 }}>החתימה בוצעה בהצלחה!</h2>
        <p style={{ color: '#555', marginBottom: 4 }}>המסמך <strong>{docData?.doc_name}</strong> נחתם.</p>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 20 }}>תודה, {signerName}!</p>
        {success.signed_pdf_url && (
          <a href={success.signed_pdf_url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-block', background: '#8B7355', color: 'white', padding: '10px 24px', borderRadius: 8, textDecoration: 'none', fontSize: 14 }}>
            הורד PDF חתום
          </a>
        )}
      </div>
    </div>
  );

  // ---- MAIN FORM ----
  const s = {
    page: { minHeight: '100vh', background: '#FAF8F5', padding: '24px 16px', fontFamily: 'Assistant, Arial, sans-serif', direction: 'rtl' },
    card: { maxWidth: 540, margin: '0 auto', background: 'white', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden' },
    header: { background: '#8B7355', padding: '20px 24px', color: 'white' },
    body: { padding: 24 },
    label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, direction: 'rtl', boxSizing: 'border-box' },
    canvasWrap: { border: '2px solid #ddd', borderRadius: 10, overflow: 'hidden', background: '#fafafa', cursor: 'crosshair', touchAction: 'none' },
    btnPrimary: { width: '100%', padding: '13px', background: submitting ? '#b0997c' : '#8B7355', color: 'white', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: submitting ? 'default' : 'pointer', marginTop: 16 },
    btnClear: { fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textDecoration: 'underline' },
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Header */}
        <div style={s.header}>
          <p style={{ fontSize: 11, opacity: 0.7, margin: '0 0 4px' }}>Michal Wolberger Interior Design</p>
          <h1 style={{ margin: 0, fontSize: 20 }}>חתימה דיגיטלית</h1>
          <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: 14 }}>{docData.doc_name}</p>
        </div>

        <div style={s.body}>
          {/* Client / project info */}
          {(docData.client_name || docData.project_name) && (
            <p style={{ fontSize: 13, color: '#888', margin: '0 0 20px' }}>
              {docData.client_name && <span>לקוח: <strong>{docData.client_name}</strong></span>}
              {docData.project_name && <span style={{ marginRight: 12 }}>פרויקט: <strong>{docData.project_name}</strong></span>}
            </p>
          )}

          {/* PDF link */}
          {docData.file_url && (
            <div style={{ marginBottom: 20, padding: '12px 16px', background: '#FAF8F5', borderRadius: 8, border: '1px solid #e8e0d5' }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: '#555' }}>לפני החתימה, מומלץ לעיין במסמך:</p>
              <a href={docData.file_url} target="_blank" rel="noopener noreferrer"
                style={{ color: '#8B7355', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                📄 פתח את המסמך לצפייה ←
              </a>
            </div>
          )}

          {/* Signer name */}
          <div style={{ marginBottom: 20 }}>
            <label style={s.label}>שם מלא *</label>
            <input
              style={s.input}
              type="text"
              placeholder="הזן שם מלא"
              value={signerName}
              onChange={e => setSignerName(e.target.value)}
            />
          </div>

          {/* Signature canvas */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ ...s.label, margin: 0 }}>חתימה *</label>
              <button style={s.btnClear} onClick={clearCanvas}>נקה</button>
            </div>
            <div style={s.canvasWrap}>
              <canvas
                ref={canvasRef}
                width={500}
                height={160}
                style={{ width: '100%', height: 160, display: 'block' }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
            </div>
            {!hasSignature && (
              <p style={{ fontSize: 12, color: '#aaa', margin: '4px 0 0', textAlign: 'center' }}>חתום כאן עם העכבר / האצבע</p>
            )}
          </div>

          {/* Agreement checkbox */}
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <input
              type="checkbox"
              id="agree"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              style={{ marginTop: 2, width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
            />
            <label htmlFor="agree" style={{ fontSize: 13, color: '#444', cursor: 'pointer', lineHeight: 1.5 }}>
              קראתי את המסמך <strong>{docData.doc_name}</strong> והנני מאשר/ת בחתימתי שקיבלתי אותו ומסכים/ה לתוכנו.
            </label>
          </div>

          {/* Submit */}
          <button
            style={s.btnPrimary}
            onClick={handleSubmit}
            disabled={submitting}
          >
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
