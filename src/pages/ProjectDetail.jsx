import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import useCurrentUser from '@/lib/useCurrentUser';
import EmptyState from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, CreditCard, FileText, MessageSquare, CheckSquare, Upload, Truck, BarChart3, Wallet, ShoppingCart, ClipboardList, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import UploadDocumentDialog from '@/components/documents/UploadDocumentDialog';
import { Button } from '@/components/ui/button';

import STAGES, { TOTAL_STAGES } from '@/lib/stageConfig';
import StageSelector from '@/components/projects/StageSelector';
import StagePanel from '@/components/projects/StagePanel';
import ProjectSuppliersTab from '@/components/suppliers/ProjectSuppliersTab';
import GanttChart from '@/components/projects/GanttChart';
import BudgetOverview from '@/components/projects/BudgetOverview';
import ProjectPurchaseOrders from '@/components/purchases/ProjectPurchaseOrders';
import QuestionnaireResponsesView from '@/components/questionnaire/QuestionnaireResponsesView';
import DetailedQuestionnairePreview from '@/components/questionnaire/DetailedQuestionnairePreview';
import MeetingsList from '@/components/meetings/MeetingsList';


export default function ProjectDetail() {
  const pathParts = window.location.pathname.split('/');
  const projectId = pathParts[pathParts.length - 1];
  const { isAdmin } = useCurrentUser();
  const [showUploadDoc, setShowUploadDoc] = React.useState(false);
  const [selectedStage, setSelectedStage] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState('overview');
  const queryClient = useQueryClient();

  const updateProjectStatus = useMutation({
    mutationFn: (newStatus) => base44.entities.Project.update(projectId, { status: newStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 200),
  });
  const project = projects.find(p => p.id === projectId);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
  });
  const client = project ? clients.find(c => c.id === project.client_id) : null;

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-created_date', 200),
    enabled: isAdmin,
  });
  const projectPayments = isAdmin ? payments.filter(p => p.project_id === projectId) : [];

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date', 200),
  });
  const projectDocs = documents.filter(d => d.project_id === projectId && d.is_current !== false);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 200),
  });
  const projectTasks = tasks.filter(t => t.project_id === projectId);

  const { data: communications = [] } = useQuery({
    queryKey: ['communications'],
    queryFn: () => base44.entities.Communication.list('-created_date', 200),
  });
  const projectComms = communications
    .filter(c => c.project_id === projectId)
    .filter(c => isAdmin || c.type !== 'system_error');

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => base44.entities.Meeting.list('-created_date', 500),
  });
  const projectMeetings = meetings.filter(m => m.project_id === projectId);

  const clientId = project?.client_id;
  const { data: projectQuestionnaires = [] } = useQuery({
    queryKey: ['questionnaires', clientId],
    queryFn: async () => {
      const byClientId = await base44.entities.Questionnaire.filter({ client_id: clientId });
      // Also fetch by phone/email for generic questionnaires
      const c = client;
      const byPhone = c?.phone ? await base44.entities.Questionnaire.filter({ phone: c.phone }) : [];
      const byEmail = c?.email ? await base44.entities.Questionnaire.filter({ email: c.email }) : [];
      const all = [...byClientId, ...byPhone, ...byEmail];
      return Array.from(new Map(all.map(q => [q.id, q])).values());
    },
    enabled: !!clientId && !!client,
  });

  if (!project) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">טוען...</div>;
  }

  return (
    <div>
      <div className="mb-4">
        <Link to="/projects" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowRight className="w-4 h-4" />חזרה לפרויקטים
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading">{project.name}</h1>
          {client && (
            <Link to={`/clients/${client.id}`} className="text-sm text-primary hover:underline">{client.name}</Link>
          )}
        </div>
        {isAdmin ? (
        <select
          value={project.status}
          onChange={e => updateProjectStatus.mutate(e.target.value)}
          className="text-sm border rounded-lg px-3 py-1.5 bg-background cursor-pointer font-medium"
        >
          <option value="active">פעיל</option>
          <option value="on_hold">מושהה</option>
          <option value="completed">הושלם</option>
          <option value="cancelled">בוטל</option>
        </select>
      ) : (
        <StatusBadge status={project.status} />
      )}
      </div>

      {/* 13 Stages — Clickable */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <h3 className="font-heading font-semibold mb-4">שלבי הפרויקט <span className="text-sm font-normal text-muted-foreground">(לחצי על שלב לצפייה)</span></h3>
          <StageSelector project={project} selectedStage={selectedStage} onSelect={setSelectedStage} />
        </CardContent>
      </Card>

      {/* Stage detail panel */}
      {selectedStage && (
        <div className="mb-6">
          <StagePanel project={project} stageNum={selectedStage} onNavigateTab={(tab) => { setSelectedStage(null); setActiveTab(tab); }} />
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="overview">סקירה</TabsTrigger>
          {isAdmin && <TabsTrigger value="payments">תשלומים</TabsTrigger>}
          <TabsTrigger value="meetings">פגישות</TabsTrigger>
          <TabsTrigger value="documents">מסמכים</TabsTrigger>
          <TabsTrigger value="tasks">משימות</TabsTrigger>
          <TabsTrigger value="gantt">גאנט</TabsTrigger>
          <TabsTrigger value="budget">תקציב</TabsTrigger>
          <TabsTrigger value="suppliers">ספקים</TabsTrigger>
          <TabsTrigger value="purchases">רכש</TabsTrigger>
          <TabsTrigger value="questionnaires">שאלונים</TabsTrigger>
          <TabsTrigger value="communications">תקשורת</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">תקציב</p><p className="text-lg font-bold">₪{(project.total_budget || 0).toLocaleString()}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">התקדמות</p><p className="text-lg font-bold">{project.progress || 0}%</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">תאריך התחלה</p><p className="text-lg font-bold">{project.start_date ? format(new Date(project.start_date), 'dd/MM/yyyy') : '—'}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">סיום משוער</p><p className="text-lg font-bold">{project.end_date_est ? format(new Date(project.end_date_est), 'dd/MM/yyyy') : '—'}</p></CardContent></Card>
          </div>
          {project.notes && (
            <Card className="mt-4"><CardContent className="p-4"><p className="text-sm">{project.notes}</p></CardContent></Card>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="payments">
            {projectPayments.length === 0 ? <EmptyState icon={CreditCard} title="אין תשלומים" /> : (
              <div className="bg-card rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="text-right px-4 py-3 font-medium">אבן דרך</th>
                    <th className="text-right px-4 py-3 font-medium">סכום</th>
                    <th className="text-right px-4 py-3 font-medium">שולם</th>
                    <th className="text-right px-4 py-3 font-medium">תאריך יעד</th>
                    <th className="text-right px-4 py-3 font-medium">סטטוס</th>
                  </tr></thead>
                  <tbody>
                    {projectPayments.map(p => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="px-4 py-3">{p.milestone}</td>
                        <td className="px-4 py-3">₪{p.amount?.toLocaleString()}</td>
                        <td className="px-4 py-3">₪{(p.amount_paid || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.due_date ? format(new Date(p.due_date), 'dd/MM/yyyy') : '—'}</td>
                        <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        )}

        <TabsContent value="meetings">
          <MeetingsList meetings={projectMeetings} clientId={project.client_id} projectId={projectId} />
        </TabsContent>

        <TabsContent value="documents">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setShowUploadDoc(true)} className="gap-1">
              <Upload className="w-4 h-4" />
              העלאת מסמך
            </Button>
          </div>
          <UploadDocumentDialog open={showUploadDoc} onOpenChange={setShowUploadDoc} projectId={projectId} />
          {projectDocs.length === 0 ? <EmptyState icon={FileText} title="אין מסמכים" description="העלה מסמך ראשון" /> : (
            <div className="space-y-2">
              {projectDocs.map(doc => (
                <Card key={doc.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.type} • שלב {doc.stage || '—'} • גרסה {doc.version_number || 1}</p>
                    </div>
                    {doc.file_url && <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline">צפה</a>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks">
          {projectTasks.length === 0 ? <EmptyState icon={CheckSquare} title="אין משימות" /> : (
            <div className="space-y-2">
              {projectTasks.map(t => (
                <Card key={t.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.due_date ? format(new Date(t.due_date), 'dd/MM/yyyy') : ''} • {t.assigned_to || ''}</p>
                    </div>
                    <StatusBadge status={t.status} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="gantt">
          <GanttChart projectId={projectId} project={project} />
        </TabsContent>

        <TabsContent value="budget">
          <BudgetOverview projectId={projectId} totalBudget={project.total_budget} />
        </TabsContent>

        <TabsContent value="suppliers">
          <ProjectSuppliersTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="purchases">
          <ProjectPurchaseOrders projectId={projectId} />
        </TabsContent>

        <TabsContent value="questionnaires">
          <div className="space-y-4">
            <DetailedQuestionnairePreview questionnaires={projectQuestionnaires} projectId={projectId} clientId={clientId} />
            <QuestionnaireResponsesView questionnaires={projectQuestionnaires} />
          </div>
        </TabsContent>

        <TabsContent value="communications">
          {projectComms.length === 0 ? <EmptyState icon={MessageSquare} title="אין תקשורת" /> : (
            <div className="space-y-2">
              {projectComms.map(c => (
                <Card key={c.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <StatusBadge status={c.type} />
                      <span className="text-xs text-muted-foreground">{c.created_date ? format(new Date(c.created_date), 'dd/MM/yyyy HH:mm') : ''}</span>
                    </div>
                    <p className="text-sm">{c.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}