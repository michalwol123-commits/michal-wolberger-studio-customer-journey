import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ExportPDFButton({ reportType, reportData }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('generateReportPDF', {
        report_type: reportType,
        data: reportData,
      });
      const { download_url, error } = response.data;
      if (error) {
        toast.error(error);
        return;
      }
      if (download_url) {
        window.open(download_url, '_blank');
        toast.success('PDF נוצר בהצלחה');
      } else {
        toast.error('ה-PDF עדיין בתהליך, נסי שוב בעוד רגע');
      }
    } catch (err) {
      toast.error('שגיאה ביצירת PDF — ודאי שה-API Key מוגדר');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleExport} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      ייצוא PDF
    </Button>
  );
}