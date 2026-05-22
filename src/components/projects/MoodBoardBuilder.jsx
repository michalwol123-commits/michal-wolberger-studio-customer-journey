import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Download, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const TYPE_LABELS = { render: 'רנדר', inspiration: 'השראה', texture: 'טקסטורה', sketch: 'סקיצה', material: 'חומרים' };

const BG_OPTIONS = [
  { label: 'בז׳', value: '#f5f0ea' },
  { label: 'אפור', value: '#e8e8e8' },
  { label: 'לבן', value: '#ffffff' },
  { label: 'כהה', value: '#2d2d2d' },
];

export default function MoodBoardBuilder({ items, projectName, onClose }) {
  const [roomTitle, setRoomTitle] = useState('');
  const [bgColor, setBgColor] = useState('#f5f0ea');
  const [selectedIds, setSelectedIds] = useState(() =>
    new Set(items.filter(i => i.is_approved && i.file_url).map(i => i.id))
  );
  const [exporting, setExporting] = useState(false);
  const [itemTitles, setItemTitles] = useState({});
  const exportRef = useRef(null);

  const visibleItems = items.filter(i => i.file_url);
  const selectedItems = visibleItems.filter(i => selectedIds.has(i.id));

  const toggleItem = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleExportPDF = async () => {
    if (!exportRef.current || selectedItems.length === 0) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: bgColor,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [794, 1123] });
      pdf.addImage(imgData, 'JPEG', 0, 0, 794, 1123);
      const filename = `${projectName || 'moodboard'}_${roomTitle || 'board'}.pdf`;
      pdf.save(filename);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">יצירת מוד בורד</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X size={20} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-72 border-l p-4 overflow-y-auto flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">שם החדר / חלל</label>
              <Input placeholder="סלון, מטבח, חדר שינה..." value={roomTitle} onChange={e => setRoomTitle(e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">צבע רקע</label>
              <div className="flex gap-2 flex-wrap">
                {BG_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setBgColor(opt.value)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${bgColor === opt.value ? 'border-primary scale-110' : 'border-border'}`}
                    style={{ background: opt.value }}
                    title={opt.label}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">בחרי תמונות ({selectedIds.size})</label>
              <div className="space-y-2">
                {visibleItems.map(item => (
                  <label key={item.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleItem(item.id)}
                      className="rounded"
                    />
                    <img src={item.file_url} alt="" className="w-10 h-10 object-cover rounded" />
                    <input
                      type="text"
                      value={itemTitles[item.id] ?? (item.title || TYPE_LABELS[item.type] || item.type)}
                      onChange={(e) => setItemTitles(prev => ({ ...prev, [item.id]: e.target.value }))}
                      className="text-xs flex-1 bg-transparent border-0 border-b border-dashed border-muted-foreground/40 outline-none min-w-0"
                      dir="rtl"
                    />
                  </label>
                ))}
                {visibleItems.length === 0 && (
                  <p className="text-xs text-muted-foreground">אין תמונות עם קובץ בלוח</p>
                )}
              </div>
            </div>

            <Button onClick={handleExportPDF} disabled={exporting || selectedItems.length === 0} className="w-full mt-auto">
              {exporting ? <><Loader2 size={14} className="animate-spin ml-1" /> מייצא...</> : <><Download size={14} className="ml-1" /> הורד PDF</>}
            </Button>
          </div>

          <div className="flex-1 overflow-auto p-4 bg-gray-100">
            <div className="text-xs text-muted-foreground mb-2 text-center">תצוגה מקדימה (A4)</div>
            <div
              ref={exportRef}
              style={{
                width: '794px',
                minHeight: '1123px',
                background: bgColor,
                display: 'flex',
                flexDirection: 'row',
                padding: '40px',
                gap: '24px',
                fontFamily: 'Assistant, sans-serif',
                direction: 'rtl',
                boxSizing: 'border-box',
                margin: '0 auto',
              }}
            >
              <div style={{ width: '200px', flexShrink: 0 }}>
                {roomTitle && (
                  <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '24px', color: bgColor === '#2d2d2d' ? '#fff' : '#222' }}>
                    {roomTitle}
                  </h2>
                )}
                <ol style={{ fontSize: '13px', lineHeight: '2', color: bgColor === '#2d2d2d' ? '#ddd' : '#444', paddingRight: '16px' }}>
                  {selectedItems.map((item, i) => (
                    <li key={item.id}>{i + 1}. {itemTitles[item.id] ?? (item.title || TYPE_LABELS[item.type] || '')}</li>
                  ))}
                </ol>
              </div>

              <div style={{ flex: 1, columns: 2, columnGap: '12px' }}>
                {selectedItems.map(item => (
                  <img
                    key={item.id}
                    src={item.file_url}
                    alt={item.title || ''}
                    crossOrigin="anonymous"
                    style={{ width: '100%', marginBottom: '12px', breakInside: 'avoid', borderRadius: '4px', display: 'block' }}
                  />
                ))}
                {selectedItems.length === 0 && (
                  <div style={{ color: '#aaa', fontSize: '14px', textAlign: 'center', paddingTop: '60px' }}>
                    בחרי תמונות מהרשימה משמאל
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}