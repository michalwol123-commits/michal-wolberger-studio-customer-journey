import React from 'react';
import { Input } from '@/components/ui/input';
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
        <div className="grid grid-cols-[1fr_repeat(3,80px)] bg-muted/50 text-xs font-semibold text-center border-b">
          <div className="px-2 py-1.5 text-right" />
          {COLS.map(c => <div key={c} className="px-1 py-1.5">{COL_LABELS[c]}</div>)}
        </div>
        {ROWS.map((row, i) => (
          <div key={row.key} className={`grid grid-cols-[1fr_repeat(3,80px)] items-center ${i < ROWS.length - 1 ? 'border-b' : ''}`}>
            <div className="px-2 py-1 text-xs text-right">{row.label}</div>
            {COLS.map(col => (
              <div key={col} className="flex items-center gap-0.5 px-1 py-0.5">
                <Input
                  value={data[row.key]?.[col] || ''}
                  onChange={e => update(row.key, col, e.target.value)}
                  className="h-7 text-xs text-center px-1"
                />
                <button
                  type="button"
                  onClick={() => toggleCheck(row.key, col)}
                  className="shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-green-600 transition-colors"
                  title="הכנס ✓"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}