import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

/**
 * Generic CSV export button.
 * @param {Object[]} data - Array of objects to export
 * @param {Object[]} columns - Array of { key, label, format? }
 * @param {string} filename - CSV filename (without extension)
 */
export default function ExportCSVButton({ data, columns, filename = 'export' }) {
  const handleExport = () => {
    if (!data || data.length === 0) return;

    const BOM = '\uFEFF';
    const header = columns.map(c => c.label).join(',');
    const rows = data.map(row =>
      columns.map(c => {
        const val = c.format ? c.format(row) : (row[c.key] ?? '');
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(',')
    );

    const csv = BOM + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5" disabled={!data?.length}>
      <Download className="w-4 h-4" />
      <span className="hidden sm:inline">ייצוא CSV</span>
    </Button>
  );
}