import React, { useRef, useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Eraser, Undo2, Loader2, Type } from 'lucide-react';
import { toast } from 'sonner';

// A writing pad for the iPad. The Apple Pencil writes; once the pencil has been used,
// finger/palm touches are ignored so a resting hand doesn't draw.
// "המרה לטקסט" saves the page as an image and returns its transcription (meetingSummary → transcribe).
export default function HandwritingPad({ onText, onImage }) {
  const canvasRef = useRef(null);
  const strokes = useRef([]);
  const current = useRef(null);
  const penSeen = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [busy, setBusy] = useState(false);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of strokes.current) {
      ctx.beginPath();
      s.forEach((p, i) => {
        ctx.lineWidth = 1.2 + (p.pressure || 0.5) * 2.2;
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      });
      if (s.length === 1) ctx.lineTo(s[0].x + 0.1, s[0].y + 0.1);
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      redraw();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [redraw]);

  const point = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, pressure: e.pressure };
  };

  const onDown = (e) => {
    if (e.pointerType === 'pen') penSeen.current = true;
    if (penSeen.current && e.pointerType === 'touch') return;
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    current.current = [point(e)];
    strokes.current.push(current.current);
    redraw();
  };

  const onMove = (e) => {
    if (!current.current) return;
    e.preventDefault();
    const events = e.nativeEvent.getCoalescedEvents?.() || [e.nativeEvent];
    // Draw only the new segment; a full redraw happens on undo, clear and resize.
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const ev of events) {
      const prev = current.current[current.current.length - 1];
      const p = point(ev);
      current.current.push(p);
      ctx.lineWidth = 1.2 + (p.pressure || 0.5) * 2.2;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  };

  const onUp = () => {
    if (!current.current) return;
    current.current = null;
    setHasInk(strokes.current.length > 0);
  };

  const undo = () => { strokes.current.pop(); redraw(); setHasInk(strokes.current.length > 0); };
  const clear = () => { strokes.current = []; redraw(); setHasInk(false); };

  const convert = async () => {
    const canvas = canvasRef.current;
    // Export on white, so the transcription sees dark ink on a light page.
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height;
    const octx = out.getContext('2d');
    octx.fillStyle = '#ffffff';
    octx.fillRect(0, 0, out.width, out.height);
    octx.drawImage(canvas, 0, 0);
    setBusy(true);
    try {
      const blob = await new Promise(res => out.toBlob(res, 'image/png'));
      const file = new File([blob], `handwriting_${Date.now()}.png`, { type: 'image/png' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onImage?.(file_url);
      const res = await base44.functions.invoke('meetingSummary', { action: 'transcribe', file_url });
      const data = res?.data ?? res;
      if (!data?.ok) throw new Error(data?.error || 'התמלול נכשל');
      onText?.(data.text);
      clear();
      toast.success('כתב היד הומר לטקסט. אפשר לערוך אותו למעלה');
    } catch (err) {
      toast.error(`לא הצלחתי להמיר: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={onUp}
        className="w-full rounded-lg border bg-white"
        style={{
          height: '45vh',
          touchAction: 'none',
          backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 39px, #ece6df 39px, #ece6df 40px)',
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={convert} disabled={!hasInk || busy} className="gap-1">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Type className="w-4 h-4" />}
          המרה לטקסט
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={undo} disabled={!hasInk || busy} className="gap-1">
          <Undo2 className="w-4 h-4" /> ביטול קו
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={clear} disabled={!hasInk || busy} className="gap-1">
          <Eraser className="w-4 h-4" /> ניקוי
        </Button>
        <span className="text-xs text-muted-foreground">כותבים בעט, ולוחצים "המרה לטקסט". הדף נשמר גם כתמונה בסיכום.</span>
      </div>
    </div>
  );
}
