import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, XCircle, PenLine, FileText, ExternalLink } from 'lucide-react';

export default function SignDocument() {
  const [loading, setLoading] = useState(true);
  const [docData, setDocData] = useState(null);
  const [error, setError] = useState(null);
  const [signed, setSigned] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  const token = new URLSearchParams(window.location.search).get('token');

  useEffect(() => {
    if (!token) { setError('missing_token'); setLoading(false); return; }
    base44.functions.invoke('getSignatureData', { token })
      .then(res => { setDocData(res.data); setLoading(false); })
      .catch(err => {
        const msg = err?.response?.data?.error;
        setError(msg === 'already_signed' ? 'already_signed' : msg || 'unknown');
        setLoading(false);
      });
  }, [token]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches?.[0] || e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    isDrawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDraw = () => { isDrawing.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = async () => {
    if (!signerName || !agreed || !hasSignature) return;
    setSubmitting(true);
    const signature_image_url = canvasRef.current.toDataURL('image/png');
    const res = await base44.functions.invoke('submitSignature', { token, signer_name: signerName, signature_image_url });
    if (res.data?.status === 'ok') setSigned(true);
    setSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
      <div className="text-center space-y-3 max-w-sm">
        {error === 'already_signed' ? (
          <>
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
            <h2 className="font-heading text-xl font-bold">המסמך כבר נחתם</h2>
            <p className="text-muted-foreground text-sm">החתימה כבר התקבלה ונשמרה במערכת.</p>
          </>
        ) : (
          <>
            <XCircle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="font-heading text-xl font-bold">
              {error === 'missing_token' ? 'קישור חסר' : error === 'not_found' ? 'מסמך לא נמצא' : 'שגיאה'}
            </h2>
            <p className="text-muted-foreground text-sm">נא לפנות לסטודיו מיכל וולברגר.</p>
          </>
        )}
      </div>
    </div>
  );

  if (signed) return (
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
      <div className="text-center space-y-4 max-w-sm">
        <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto" />
        <h2 className="font-heading text-2xl font-bold">המסמך נחתם בהצלחה!</h2>
        <p className="text-muted-foreground">החתימה התקבלה ונשמרה במערכת. תודה!</p>
      </div>
    </div>
  );

  const TYPE_LABELS = { contract: 'חוזה', quote: 'הצעת מחיר', plan: 'תוכנית', concept: 'קונספט', other: 'מסמך' };

  return (
    <div className="min-h-screen bg-background p-4" dir="rtl">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center bg-primary text-primary-foreground rounded-xl p-6">
          <h1 className="font-heading text-2xl font-bold">סטודיו מיכל וולברגר</h1>
          <p className="text-sm opacity-85 mt-1">עיצוב פנים</p>
        </div>

        <div className="bg-card border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-lg font-bold">{docData.name}</h2>
          </div>
          <p className="text-muted-foreground text-sm">סוג: {TYPE_LABELS[docData.type] || docData.type}</p>
          {docData.client_name && <p className="text-muted-foreground text-sm">לקוח/ה: {docData.client_name}</p>}
          <p className="text-muted-foreground text-sm">תאריך: {new Date().toLocaleDateString('he-IL')}</p>
          {docData.file_url && (
            <a href={docData.file_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary text-sm hover:underline mt-2">
              <ExternalLink className="w-4 h-4" /> צפייה במסמך
            </a>
          )}
        </div>

        <div className="bg-card border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><PenLine className="w-4 h-4" />חתימה דיגיטלית</h3>

          <div>
            <label className="text-sm font-medium block mb-1">שם מלא *</label>
            <input
              type="text"
              value={signerName}
              onChange={e => setSignerName(e.target.value)}
              placeholder="הכנס/י שם מלא"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">חתימה *</label>
            <div className="border-2 border-dashed rounded-lg bg-white relative">
              <canvas
                ref={canvasRef}
                width={460}
                height={150}
                className="w-full touch-none cursor-crosshair"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
              {!hasSignature && (
                <p className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm pointer-events-none">חתמ/י כאן</p>
              )}
            </div>
            {hasSignature && (
              <button onClick={clearCanvas} className="text-xs text-muted-foreground underline mt-1">נקה חתימה</button>
            )}
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5" />
            <span className="text-sm">קראתי את המסמך ואני מאשר/ת את תוכנו</span>
          </label>

          <button
            onClick={handleSubmit}
            disabled={!signerName || !agreed || !hasSignature || submitting}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            אישור וחתימה
          </button>
        </div>
      </div>
    </div>
  );
}