import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/shared/PageHeader';
import ExportPDFButton from '@/components/reports/ExportPDFButton';
import ProjectsReport from '@/components/reports/ProjectsReport';
import FinancialReport from '@/components/reports/FinancialReport';
import LeadsReport from '@/components/reports/LeadsReport';
import SuppliersReport from '@/components/reports/SuppliersReport';
import useCurrentUser from '@/lib/useCurrentUser';
import { Loader2 } from 'lucide-react';

export default function Reports() {
  const { isAdmin } = useCurrentUser();
  const [activeTab, setActiveTab] = React.useState('projects');

  const { data: projects = [], isLoading: lp } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list() });
  const { data: clients = [], isLoading: lc } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list() });
  const { data: payments = [], isLoading: lpay } = useQuery({ queryKey: ['payments'], queryFn: () => base44.entities.Payment.list(), enabled: isAdmin });
  const { data: suppliers = [], isLoading: ls } = useQuery({ queryKey: ['suppliers'], queryFn: () => base44.entities.Supplier.list() });
  const { data: projectSuppliers = [], isLoading: lps } = useQuery({ queryKey: ['projectSuppliers'], queryFn: () => base44.entities.ProjectSupplier.list() });

  const isLoading = lp || lc || lpay || ls || lps;

  const getReportData = () => {
    switch (activeTab) {
      case 'projects': return { projects, clients };
      case 'financial': return { payments, projects };
      case 'leads': return { clients };
      case 'suppliers': return { suppliers, projectSuppliers, projects };
      default: return {};
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto" dir="rtl">
      <PageHeader title="דוחות" subtitle="סיכומים וייצוא PDF">
        <ExportPDFButton reportType={activeTab} reportData={getReportData()} />
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="mb-6">
          <TabsTrigger value="projects">פרויקטים</TabsTrigger>
          {isAdmin && <TabsTrigger value="financial">כספי</TabsTrigger>}
          <TabsTrigger value="leads">לידים</TabsTrigger>
          <TabsTrigger value="suppliers">ספקים</TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          <ProjectsReport projects={projects} clients={clients} />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="financial">
            <FinancialReport payments={payments} projects={projects} />
          </TabsContent>
        )}
        <TabsContent value="leads">
          <LeadsReport clients={clients} />
        </TabsContent>
        <TabsContent value="suppliers">
          <SuppliersReport suppliers={suppliers} projectSuppliers={projectSuppliers} projects={projects} />
        </TabsContent>
      </Tabs>
    </div>
  );
}