import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import useCurrentUser from '@/lib/useCurrentUser';
import EmptyState from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowRight, CreditCard, FileText, MessageSquare, CheckSquare, Upload, Truck, BarChart3, Wallet, ShoppingCart, ClipboardList, CalendarDays, Plus, Trash2, Pencil, Send, ClipboardCheck } from 'lucide-react';
import DeleteButton from '@/components/shared/DeleteButton';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import UploadDocumentDialog from '@/components/documents/UploadDocumentDialog';
import EditPaymentDialog from '@/components/payments/EditPaymentDialog';
import AddTaskDialog from '@/components/tasks/AddTaskDialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import STAGES, { TOTAL_STAGES } from '@/lib/stageConfig';
import StageSelector from '@/components/projects/StageSelector';
import StagePanel from '@/components/projects/StagePanel';
import ProjectSuppliersTab from '@/components/suppliers/ProjectSuppliersTab';
import GanttChart from '@/components/projects/GanttChart';
import BudgetOverview from '@/components/projects/BudgetOverview';

import QuestionnaireResponsesView from '@/components/questionnaire/QuestionnaireResponsesView';
import DetailedQuestionnairePreview from '@/components/questionnaire/DetailedQuestionnairePreview';
import MeetingsList from '@/components/meetings/MeetingsList';
import ProjectOverview from '@/components/projects/ProjectOverview';
import SendQuestionnaireDialog from '@/components/questionnaire/SendQuestionnaireDialog';
import DocumentSignatureBadge from '@/components/documents/DocumentSignatureBadge';
import FieldVisitCard from '@/components/fieldvisits/FieldVisitCard';
import FieldVisitForm from '@/components/fieldvisits/FieldVisitForm';
import FieldVisitSummary from '@/components/fieldvisits/FieldVisitSummary';


export default function ProjectDetail() {
  const pathParts = window.location.pathname.split('/');
  const projectId = pathParts[pathParts.length - 1];
  const { isAdmin } = useCurrentUser();
  const [showUploadDoc, setShowUploadDoc] = React.useState(false);
  const [selectedStage, setSelectedStage] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState('overview');
  const [editPayment, setEditPayment] = React.useState(null);
  const [editTask, setEditTask] = React.useState(null);
  const [showAddTask, setShowAddTask] = React.useState(false);
  const [showSendDetailedQ, setShowSendDetailedQ] = React.useState(false);
  const [fieldVisitView, setFieldVisitView] = React.useState(null); // null | { mode: 'form'|'summary', visit?: obj }
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
  const projectDocs = documents.filter(d => (d.project_id === projectId || (!d.project_id && d.client_id === project?.client_id)) && d.is_current !== false);

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

  const { data: fieldVisits = [] } = useQuery({
    queryKey: ['field-visits', projectId],
    queryFn: () => base44.entities.FieldVisit.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const clientId = project?.client_id;
  const { data: projectQuestionnaires = [] } = useQuery({
    queryKey: ['questionnaires', clientId],
    queryFn: async () => {
      const byClientId = await base44.entities.Questionnaire.filter({ client_id: clientId });
      const c = client;
      const byPhone = c?.phone ? await base44.entities.Questionnaire.filter({ phone: c.phone }) : [];
      const byEmail = c?.email ? await base44.entities.Questionnaire.filter({ email: c.email }) : [];
      const all = [...byClientId, ...byPhone, ...byEmail];
      return Array.from(new Map(all.map(q => [q.id, q])).values());
    },
    enabled: !!clientId && !!client,
  });

  const defaultVisitType = project?.stage_current >= 12 ? 'installation' : 'supervision';
  const showFieldVisitsTab = project?.stage_current >= 9;

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
          <div data-tutorial="stage-selector"><StageSelector project={project} selectedStage={selectedStage} onSelect={setSelectedStage} /></div>
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
          <TabsTrigger value="suppliers">ספקים ורכש</TabsTrigger>
          <TabsTrigger value="questionnaires">שאלונים</TabsTrigger>
          <TabsTrigger value="communications">תקשורת</TabsTrigger>
          {showFieldVisitsTab && (
            <TabsTrigger value="field-visits" className="flex items-center gap-1">
              <ClipboardCheck className="w-3.5 h-3.5" />
              דוחות שטח
              {fieldVisits.length > 0 && (
                <span className="mr-1 bg-primary/15 text-primary text-xs rounded-full px-1.5 py-0.5">
                  {fieldVisits.length}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview">
          <ProjectOverview project={project} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="payments">
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={() => setEditPayment({ client_id: project.client_id, project_id: projectId })} className="gap-1">
                <Plus className="w-4 h-4" />
                תשלום חדש
              </Button>
            </div>
            {projectPayments.length === 0 ? <EmptyState icon={CreditCard} title="אין תשלומים" /> : (
              <div className="space-y-2">
                {projectPayments.map(p => (
                  <Card key={p.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex-1 cursor-pointer" onClick={() => setEditPayment(p)}>
                        <p className="font-medium text-sm">{p.milestone}</p>
                        <p className="text-xs text-muted-foreground">
                          ₪{p.amount?.toLocaleString()} • שולם: ₪{(p.amount_paid || 0).toLocaleString()} • {p.due_date ? format(new Date(p.due_date), 'dd/MM/yyyy') : '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={p.status} />
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); setEditPayment(p); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('למחוק תשלום זה?')) {
                            base44.entities.Payment.delete(p.id).then(() => queryClient.invalidateQueries({ queryKey: ['payments'] }));
                          }
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {editPayment && (
              <EditPaymentDialog
                open={!!editPayment}
                onOpenChange={(open) => { if (!open) setEditPayment(null); }}
                payment={editPayment}
              />
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
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.type} • שלב {doc.stage || '—'} • גרסה {doc.version_number || 1}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.file_url && <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline">צפה</a>}
                        <DeleteButton
                          entityLabel="מסמך"
                          onDelete={async () => {
                            await base44.entities.Document.delete(doc.id);
                            queryClient.invalidateQueries({ queryKey: ['documents'] });
                          }}
                          size="sm"
                        />
                      </div>
                    </div>
                    <DocumentSignatureBadge doc={doc} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => { setEditTask(null); setShowAddTask(true); }} className="gap-1">
              <Plus className="w-4 h-4" />
              משימה חדשה
            </Button>
          </div>
          {projectTasks.length === 0 ? <EmptyState icon={CheckSquare} title="אין משימות" /> : (
            <div className="space-y-2">
              {projectTasks.map(t => (
                <Card key={t.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => { setEditTask(t); setShowAddTask(true); }}>
                      <p className="font-medium text-sm">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.due_date ? format(new Date(t.due_date), 'dd/MM/yyyy') : ''} • {t.assigned_to || ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={t.status} />
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('למחוק משימה זו?')) {
                          base44.entities.Task.delete(t.id).then(() => queryClient.invalidateQueries({ queryKey: ['tasks'] }));
                        }
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <AddTaskDialog
            open={showAddTask}
            onOpenChange={(open) => { setShowAddTask(open); if (!open) setEditTask(null); }}
            initialData={editTask || { client_id: project?.client_id, project_id: projectId }}
          />
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

        <TabsContent value="questionnaires">
          <div className="space-y-4">
            {client && (
              <div className="flex justify-end">
                {client.portal_token && !client.portal_token_revoked ? (
                  <Button size="sm" onClick={() => setShowSendDetailedQ(true)} className="gap-1">
                    <Send className="w-4 h-4" />
                    שלח שאלון מפורט
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">⚠️ יש ליצור קישור פורטל ללקוח כדי לשלוח שאלון</p>
                )}
              </div>
            )}
            <DetailedQuestionnairePreview questionnaires={projectQuestionnaires} projectId={projectId} clientId={clientId} />
            <QuestionnaireResponsesView questionnaires={projectQuestionnaires.filter(q => q.type !== 'detailed')} />
          </div>
          {showSendDetailedQ && client?.portal_token && (
            <SendQuestionnaireDialog
              open={showSendDetailedQ}
              onOpenChange={setShowSendDetailedQ}
              client={client}
              questionnaireType="detailed"
              questionnaireLink={`${window.location.origin}/portal?token=${client.portal_token}`}
            />
          )}
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

        {/* ── Field Visits Tab ── */}
        {showFieldVisitsTab && (
          <TabsContent value="field-visits">
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => setFieldVisitView({ mode: 'form', visit: null })}
                className="bg-[#8B7355] hover:bg-[#7a6548] text-white gap-1"
              >
                <Plus className="w-4 h-4" />
                ביקור חדש
              </Button>
            </div>

            {fieldVisits.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">אין ביקורי שטח עדיין</p>
                <p className="text-xs mt-1">לחצי על "ביקור חדש" להתחיל</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...fieldVisits]
                  .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date))
                  .map(visit => (
                    <FieldVisitCard
                      key={visit.id}
                      visit={visit}
                      onClick={() => setFieldVisitView({ mode: 'summary', visit })}
                    />
                  ))}
              </div>
            )}

            {/* Form dialog */}
            <Dialog
              open={fieldVisitView?.mode === 'form'}
              onOpenChange={(open) => { if (!open) setFieldVisitView(null); }}
            >
              <DialogContent className="max-w-lg h-[90vh] p-0 overflow-y-auto">
                <FieldVisitForm
                  projectId={projectId}
                  visit={fieldVisitView?.visit}
                  defaultVisitType={defaultVisitType}
                  onClose={() => setFieldVisitView(null)}
                  onSaved={() => queryClient.invalidateQueries({ queryKey: ['field-visits', projectId] })}
                />
              </DialogContent>
            </Dialog>

            {/* Summary dialog */}
            <Dialog
              open={fieldVisitView?.mode === 'summary'}
              onOpenChange={(open) => { if (!open) setFieldVisitView(null); }}
            >
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                {fieldVisitView?.visit && (
                  <FieldVisitSummary
                    visitId={fieldVisitView.visit.id}
                    onEdit={() => setFieldVisitView({ mode: 'form', visit: fieldVisitView.visit })}
                    onClose={() => setFieldVisitView(null)}
                    onDelete={() => {
                      queryClient.invalidateQueries({ queryKey: ['field-visits', projectId] });
                      setFieldVisitView(null);
                    }}
                  />
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}

      </Tabs>
    </div>
  );
}