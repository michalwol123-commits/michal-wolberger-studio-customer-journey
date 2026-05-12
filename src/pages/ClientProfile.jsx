import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import useCurrentUser from '@/lib/useCurrentUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowRight, Phone, Mail, MapPin, Briefcase, CreditCard, FileText, MessageSquare, Upload, ExternalLink, Copy, Check, RefreshCw, Ban, Clock, Trash2, ClipboardList } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import EmptyState from '@/components/shared/EmptyState';
import UploadDocumentDialog from '@/components/documents/UploadDocumentDialog';
import ClientStatusChanger from '@/components/clients/ClientStatusChanger';
import ClientTimeline from '@/components/clients/ClientTimeline';
import DeleteButton from '@/components/shared/DeleteButton';
import QuestionnaireResponsesView from '@/components/questionnaire/QuestionnaireResponsesView';

export default function ClientProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const pathParts = window.location.pathname.split('/');
  const clientId = pathParts[pathParts.length - 1];
  const { user, isAdmin } = useCurrentUser();
  const [showUploadDoc, setShowUploadDoc] = useState(false);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const generateTokenMutation = useMutation({
    mutationFn: async (clientObj) => {
      const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);
      await base44.entities.Client.update(clientObj.id, {
        portal_token: token,
        portal_token_expires_at: expiresAt.toISOString(),
        portal_token_revoked: false,
      });
      return token;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client', clientId] }),
  });

  const revokeTokenMutation = useMutation({
    mutationFn: async (clientObj) => {
      await base44.entities.Client.update(clientObj.id, { portal_token_revoked: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client', clientId] }),
  });

  const getPortalUrl = (token) => {
    const origin = window.location.origin;
    return `${origin}/portal?token=${token}`;
  };

  const handleOpenPortal = async () => {
    let token = client.portal_token;
    if (!token || client.portal_token_revoked) {
      token = await generateTokenMutation.mutateAsync(client);
    }
    window.open(getPortalUrl(token), '_blank');
  };

  const handleCopyLink = async () => {
    let token = client.portal_token;
    if (!token || client.portal_token_revoked) {
      token = await generateTokenMutation.mutateAsync(client);
    }
    await navigator.clipboard.writeText(getPortalUrl(token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { data: clientArr = [] } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => base44.entities.Client.filter({ id: clientId }),
  });
  const client = clientArr[0];

  const { data: clientProjects = [] } = useQuery({
    queryKey: ['projects', clientId],
    queryFn: () => base44.entities.Project.filter({ client_id: clientId }, '-created_date', 200),
  });

  const projectIds = clientProjects.map(p => p.id);

  const { data: allPayments = [] } = useQuery({
    queryKey: ['payments', clientId],
    queryFn: () => base44.entities.Payment.filter({ client_id: clientId }, '-created_date', 200),
    enabled: isAdmin,
  });
  const projectPayments = isAdmin ? allPayments : [];

  const { data: clientDocs = [] } = useQuery({
    queryKey: ['documents', clientId],
    queryFn: () => base44.entities.Document.filter({ client_id: clientId }, '-created_date', 200),
  });

  const { data: allComms = [] } = useQuery({
    queryKey: ['communications', clientId],
    queryFn: () => base44.entities.Communication.filter({ client_id: clientId }, '-created_date', 200),
  });
  const clientComms = allComms.filter(c => isAdmin || c.type !== 'system_error');

  const { data: clientQuestionnaires = [] } = useQuery({
    queryKey: ['questionnaires', clientId],
    queryFn: () => base44.entities.Questionnaire.filter({ client_id: clientId }),
  });

  if (!client) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">טוען...</div>;
  }



  const budgetLabels = { up_to_100k: 'עד ₪100K', '100_300k': '₪100K-300K', '300_500k': '₪300K-500K', above_500k: 'מעל ₪500K' };
  const propertyLabels = { apartment: 'דירה', house: 'בית', office: 'משרד', commercial: 'מסחרי' };

  return (
    <div>
      <div className="mb-4">
        <Link to={['lead', 'qualified', 'proposal_sent'].includes(client.status) ? '/leads' : '/clients'} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowRight className="w-4 h-4" />
          {['lead', 'qualified', 'proposal_sent'].includes(client.status) ? 'חזרה ללידים' : 'חזרה לרשימה'}
        </Link>
      </div>
      
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold font-heading">
            {client.name?.[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading">
              {['lead', 'qualified', 'proposal_sent'].includes(client.status) ? 'כרטיס ליד' : 'כרטיס לקוח'} — {client.name}
            </h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <ClientStatusChanger client={client} />
              {client.tags?.map(t => (
                <span key={t} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{t}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={handleCopyLink} className="gap-1">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'הועתק!' : 'העתק קישור פורטל'}
          </Button>
          <Button size="sm" onClick={handleOpenPortal} className="gap-1">
            <ExternalLink className="w-4 h-4" />
            צפה בפורטל
          </Button>
          <Button size="sm" variant="outline" onClick={() => generateTokenMutation.mutate(client)} className="gap-1">
            <RefreshCw className="w-4 h-4" />
            חדש קישור
          </Button>
          {client.portal_token && !client.portal_token_revoked && (
            <Button size="sm" variant="destructive" onClick={() => revokeTokenMutation.mutate(client)} className="gap-1">
              <Ban className="w-4 h-4" />
              בטל קישור
            </Button>
          )}
        </div>
      </div>

      {/* Contact Info */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span dir="ltr">{client.phone}</span>
            </div>
            {client.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span dir="ltr">{client.email}</span>
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{client.address}</span>
              </div>
            )}
            {client.budget_range && (
              <div className="text-muted-foreground">תקציב: {budgetLabels[client.budget_range] || client.budget_range}</div>
            )}
            {client.property_type && (
              <div className="text-muted-foreground">נכס: {propertyLabels[client.property_type] || client.property_type}</div>
            )}
            {client.source && (
              <div className="text-muted-foreground">מקור: {client.source}</div>
            )}
          </div>
          {client.notes && !isAdmin ? null : client.notes && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
              <span className="font-medium">הערות: </span>{client.notes}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="projects" dir="rtl">
        <TabsList className="mb-4">
          <TabsTrigger value="projects" className="gap-1"><Briefcase className="w-4 h-4" />פרויקטים</TabsTrigger>
          {isAdmin && <TabsTrigger value="payments" className="gap-1"><CreditCard className="w-4 h-4" />תשלומים</TabsTrigger>}
          <TabsTrigger value="documents" className="gap-1"><FileText className="w-4 h-4" />מסמכים</TabsTrigger>
          <TabsTrigger value="communications" className="gap-1"><MessageSquare className="w-4 h-4" />תקשורת</TabsTrigger>
          <TabsTrigger value="questionnaires" className="gap-1"><ClipboardList className="w-4 h-4" />שאלונים</TabsTrigger>
          <TabsTrigger value="history" className="gap-1"><Clock className="w-4 h-4" />היסטוריה</TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          {clientProjects.length === 0 ? (
            <EmptyState icon={Briefcase} title="אין פרויקטים" />
          ) : (
            <div className="space-y-3">
              {clientProjects.map(p => (
                <Link key={p.id} to={`/projects/${p.id}`} className="block">
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">שלב {p.stage_current}/13 • {p.progress || 0}%</p>
                      </div>
                      <StatusBadge status={p.status} />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="payments">
            {projectPayments.length === 0 ? (
              <EmptyState icon={CreditCard} title="אין תשלומים" />
            ) : (
              <div className="bg-card rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-right px-4 py-3 font-medium">אבן דרך</th>
                      <th className="text-right px-4 py-3 font-medium">סכום</th>
                      <th className="text-right px-4 py-3 font-medium">שולם</th>
                      <th className="text-right px-4 py-3 font-medium">תאריך יעד</th>
                      <th className="text-right px-4 py-3 font-medium">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectPayments.map(pay => (
                      <tr key={pay.id} className="border-b last:border-0">
                        <td className="px-4 py-3">{pay.milestone}</td>
                        <td className="px-4 py-3">₪{pay.amount?.toLocaleString()}</td>
                        <td className="px-4 py-3">₪{(pay.amount_paid || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-muted-foreground">{pay.due_date ? format(new Date(pay.due_date), 'dd/MM/yyyy') : '—'}</td>
                        <td className="px-4 py-3"><StatusBadge status={pay.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        )}

        <TabsContent value="documents">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setShowUploadDoc(true)} className="gap-1">
              <Upload className="w-4 h-4" />
              העלאת מסמך
            </Button>
          </div>
          <UploadDocumentDialog open={showUploadDoc} onOpenChange={setShowUploadDoc} clientId={clientId} />
          {clientDocs.length === 0 ? (
            <EmptyState icon={FileText} title="אין מסמכים" description="העלה מסמך ראשון" />
          ) : (
            <div className="space-y-2">
              {clientDocs.filter(d => d.is_current !== false).map(doc => (
                <Card key={doc.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.type} • גרסה {doc.version_number || 1}
                        {doc.stage ? ` • שלב ${doc.stage}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline">
                          צפה
                        </a>
                      )}
                      <DeleteButton
                        entityLabel="מסמך"
                        onDelete={async () => {
                          await base44.entities.Document.delete(doc.id);
                          queryClient.invalidateQueries({ queryKey: ['documents', clientId] });
                        }}
                        size="sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="questionnaires">
          <QuestionnaireResponsesView questionnaires={clientQuestionnaires} />
        </TabsContent>

        <TabsContent value="history">
          <ClientTimeline client={client} />
        </TabsContent>

        <TabsContent value="communications">
          {clientComms.length === 0 ? (
            <EmptyState icon={MessageSquare} title="אין תקשורת" />
          ) : (
            <div className="space-y-2">
              {clientComms.map(comm => (
                <Card key={comm.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={comm.type} />
                        <span className="text-xs text-muted-foreground">
                          {comm.direction === 'inbound' ? 'נכנס' : 'יוצא'}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {comm.created_date ? new Date(comm.created_date).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="text-sm">{comm.content}</p>
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