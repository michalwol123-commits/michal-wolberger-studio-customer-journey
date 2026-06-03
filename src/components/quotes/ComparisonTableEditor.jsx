import React, { useRef, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';

const ROWS = [
  { key: 'renders', label: 'הדמיות פנים פוטוריאליסטיות' },
  { key: 'materials', label: 'רשימת חומרי גמרים וכמויות' },
  { key: 'bathrooms', label: 'חדרי רחצה' },
  { key: 'project_mgmt', label: 'ניהול פרויקט' },
  { key: 'cloud', label: 'ניהול תיקייה בענן' },
  { key: 'budget', label: 'ניהול טבלת אקסל ותקציב' },
  { key: 'install_days', label: 'ימי הקמה בשטח' },
  { key: 'styling', label: 'הלבשת החלל והום סטיילינג' },
  { key: 'shopping', label: 'פגישות ליווי וימי קניות' },
];

const COLS = ['s', 'm', 'l'];
const COL_LABELS = { s: 'S', m: 'M', l: 'L' };

function emptyComparison() {
  const obj = {};
  ROWS.forEach(r => { obj[r.key] = { s: '', m: '', l: '' }; });
  return obj;
}

// תיבת טקסט שמתרחבת אוטומטית לפי התוכן (כדי שתמיד רואים מה מילאו)
function AutoTextarea({ value, onChange, checked }) {
  const ref = useRef(null);
  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(28, el.scrollHeight) + 'px';
  };
  useEffect(() => { resize(); }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onInput={resize}
      rows={1}
      dir="rtl"
      className={`w-full resize-none overflow-hidden rounded border bg-background px-1.5 py-1 text-xs leading-snug text-right focus:outline-none focus:ring-1 focus:ring-primary ${checked ? 'text-center text-green-600 font-bold' : ''}`}
    />
  );
}

export default function ComparisonTableEditor({ value, onChange }) {
  const data = value || emptyComparison();

  const update = (rowKey, col, val) => {
    const next = { ...data, [rowKey]: { ...(data[rowKey] || {}), [col]: val } };
    onChange(next);
  };

  const toggleCheck = (rowKey, col) => {
    const current = data[rowKey]?.[col] || '';
    update(rowKey, col, current === '✓' ? '' : '✓');
  };

  return (
    <div>
      <Label className="mb-2 block">טבלת השוואת חבילות (עמוד 15)</Label>
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1.3fr_repeat(3,1fr)] bg-muted/50 text-xs font-semibold text-center border-b">
          <div className="px-2 py-1.5 text-right" />
          {COLS.map(c => <div key={c} className="px-1 py-1.5">{COL_LABELS[c]}</div>)}
        </div>
        {ROWS.map((row, i) => (
          <div key={row.key} className={`grid grid-cols-[1.3fr_repeat(3,1fr)] items-start ${i < ROWS.length - 1 ? 'border-b' : ''}`}>
            <div className="px-2 py-2 text-xs text-right leading-snug">{row.label}</div>
            {COLS.map(col => {
              const v = data[row.key]?.[col] || '';
              const checked = v === '✓';
              return (
                <div key={col} className="px-1 py-1 space-y-1">
                  <AutoTextarea value={v} onChange={(val) => update(row.key, col, val)} checked={checked} />
                  <button
                    type="button"
                    onClick={() => toggleCheck(row.key, col)}
                    className={`w-full h-5 flex items-center justify-center rounded text-[10px] transition-colors ${checked ? 'bg-green-100 text-green-700' : 'hover:bg-muted text-muted-foreground hover:text-green-600'}`}
                    title="הכנס / הסר ✓"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">התיבות מתרחבות אוטומטית לפי הטקסט. לחיצה על ✓ ממלאת/מנקה סימן וי.</p>
    </div>
  );
}