import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Download, CheckCircle, AlertCircle, Calendar } from 'lucide-react';

const VISIT_TYPE_LABELS = {
  supervision: '📋 דוח פיקוח',
  installation: '🔧 דוח התקנות',
};

export default function PortalFieldVisits({ project }) {
  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['portal-field-visits', project.id],
    queryFn: () => base44.entities.FieldVisit.filter({ project_id: project.id }),
  });

  const completed = visits.filter(v => v.status === 'completed');
  if (isLoading || completed.length === 0) return null;

  return (
    <div className="space-y-3 mt-4" dir="rtl">
      <h3 className="font-semibold text-gray-700 flex items-center gap-2 text-sm">
        <FileText className="w-4 h-4 text-[#8B7355]" />
        דוחות ביקור שטח
      </h3>
      {completed.map(visit => {
        const checklist = (() => { try { return JSON.parse(visit.checklist_items || '[]'); } catch { return []; } })();
        const okCount    = checklist.filter(i => i.status === 'ok').length;
        const issueCount = checklist.filter(i => i.status === 'issue').length;
        const dateStr    = visit.visit_date ? new Date(visit.visit_date).toLocaleDateString('he-IL') : '—';

        return (
          <Card key={visit.id} className="border-r-4 border-r-[#8B7355] bg-white">
            <CardContent className="pt-3 pb-3 px-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm text-[#2C2C2C]">{VISIT_TYPE_LABELS[visit.visit_type] || visit.visit_type}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" /> {dateStr}
                  </p>
                </div>
                {visit.report_pdf_url && (
                  <a href={visit.report_pdf_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs bg-[#8B7355] text-white px-3 py-1.5 rounded-xl hover:bg-[#7a6548] transition-colors">
                    <Download className="w-3 h-3" /> הורד דוח
                  </a>
                )}
              </div>
              {checklist.length > 0 && (
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3 h-3" /> {okCount} תקין</span>
                  {issueCount > 0 && <span className="flex items-center gap-1 text-orange-500"><AlertCircle className="w-3 h-3" /> {issueCount} ממצאים</span>}
                </div>
              )}
              {visit.decisions && (
                <p className="mt-2 text-xs text-gray-500 line-clamp-2">
                  <span className="font-medium">סוכם: </span>{visit.decisions}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}