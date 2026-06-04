import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, AlertCircle } from 'lucide-react';

const VISIT_TYPE_LABELS = {
  supervision: '📋 פיקוח',
  installation: '🔧 התקנות',
};

const STATUS_CONFIG = {
  draft:     { label: 'טיוטה',  className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  completed: { label: 'הושלם', className: 'bg-green-100 text-green-700 border-green-200' },
};

export default function FieldVisitCard({ visit, onClick }) {
  const checklist = (() => {
    try { return JSON.parse(visit.checklist_items || '[]'); } catch { return []; }
  })();
  const okCount = checklist.filter(i => i.status === 'ok').length;
  const issueCount = checklist.filter(i => i.status === 'issue').length;

  const dateStr = visit.visit_date
    ? new Date(visit.visit_date).toLocaleDateString('he-IL')
    : '—';
  const statusCfg = STATUS_CONFIG[visit.status] || STATUS_CONFIG.draft;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all border-r-4 border-r-[#8B7355] bg-white"
      onClick={onClick}
    >
      <CardContent className="pt-3 pb-3 px-4" dir="rtl">
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className="font-semibold text-sm text-[#2C2C2C]">
              {VISIT_TYPE_LABELS[visit.visit_type] || visit.visit_type}
            </span>
            <p className="text-xs text-gray-400 mt-0.5">{dateStr}</p>
          </div>
          <Badge className={`text-xs ${statusCfg.className}`}>{statusCfg.label}</Badge>
        </div>

        {checklist.length > 0 && (
          <div className="flex gap-4 text-xs mt-1">
            <span className="text-green-600 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> {okCount} תקין
            </span>
            {issueCount > 0 && (
              <span className="text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {issueCount} ממצאים
              </span>
            )}
          </div>
        )}

        {visit.report_pdf_url && (
          <div className="mt-2 flex items-center gap-1 text-xs text-[#8B7355]">
            <FileText className="w-3 h-3" />
            <span>
              דוח נשלח
              {visit.report_sent_at
                ? ' ' + new Date(visit.report_sent_at).toLocaleDateString('he-IL')
                : ''}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}