import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import BulkDeleteBar from '@/components/shared/BulkDeleteBar';
import DeleteButton from '@/components/shared/DeleteButton';
import useCurrentUser from '@/lib/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Plus, LayoutGrid, List, Calendar } from 'lucide-react';
import ViewToggle from '@/components/shared/ViewToggle';
import MeetingsTable from '@/components/meetings/MeetingsTable';
import MeetingsCards from '@/components/meetings/MeetingsCards';
import AddMeetingDialog from '@/components/meetings/AddMeetingDialog';
import IntroCompletedDialog from '@/components/meetings/IntroCompletedDialog';
import { format, startOfWeek, endOfWeek, addWeeks, isWithinInterval } from 'date-fns';
import { he } from 'date-fns/locale';
import { toast } from 'sonner';

const typeLabels = {
  intro: 'היכרות', qualifying: 'אפיון', quote_presentation: 'הצגת הצעה',
  stage_review: 'סקירת שלב', site_visit: 'ביקור אתר', zoom: 'Zoom', design_approval: 'אישור עיצוב'
};

export default function Meetings() {
  const { user, isAdmin } = useCurrentUser();
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState('weekly');
  const [showAdd, setShowAdd] = useState(false);
  const [editMeeting, setEditMeeting] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [introDialogMeeting, setIntroDialogMeeting] = useState(null);
  const queryClient = useQueryClient();

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => base44.entities.Meeting.list('-scheduled_at', 200),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list('-created_date', 200),
  });

  const clientMap = {};
  clients.forEach(c => { clientMap[c.id] = c; });
  const quotesMap = {};
  quotes.forEach(q => { quotesMap[q.id] = q; });

  const filtered = isAdmin
    ? meetings
    : meetings.filter(m => {
        const client = clientMap[m.client_id];
        return client && (client.owner === user?.email);
      });

  const now = new Date();
  const weekStart = startOfWeek(addWeeks(now, weekOffset), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(addWeeks(now, weekOffset), { weekStartsOn: 0 });

  const weekMeetings = filtered.filter(m => {
    if (!m.scheduled_at) return false;
    const d = new Date(m.scheduled_at);
    return isWithinInterval(d, { start: weekStart, end: weekEnd });
  }).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

  const dayGroups = {};
  weekMeetings.forEach(m => {
    const day = format(new Date(m.scheduled_at), 'yyyy-MM-dd');
    if (!dayGroups[day]) dayGroups[day] = [];
    dayGroups[day].push(m);
  });

  const completeMutation = useMutation({
    mutationFn: async (meeting) => {
      await base44.entities.Meeting.update(meeting.id, { status: 'completed' });

    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('הפגישה סומנה כהושלמה');
    },
  });

  const introActionMutation = useMutation({
    mutationFn: async ({ meetingId, action }) => {
      const res = await base44.functions.invoke('autoIntroCompleted', { meetingId, action });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIntroDialogMeeting(null);
      if (data.action === 'continue') {
        toast.success(`${data.clientName} ממשיך — נפתחה פגישת הצעת מחיר`);
      } else {
        toast.success(`${data.clientName} הועבר לארכיון`);
      }
    },
    onError: (error) => {
      console.error('introActionMutation error:', error);
      toast.error('שגיאה — נסי שוב');
    },
  });

  const handleComplete = (meeting) => {
    if (meeting.type === 'intro') {
      setIntroDialogMeeting(meeting);
    } else {
      completeMutation.mutate(meeting);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Meeting.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meetings'] }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) await base44.entities.Meeting.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setSelectedIds([]);
      toast.success('הפגישות נמחקו');
    },
  });

  const viewOptions = [
    { value: 'weekly', icon: CalendarIcon, title: 'לוח שבועי' },
    { value: 'cards', icon: LayoutGrid, title: 'כרטיסים' },
    { value: 'table', icon: List, title: 'טבלה' },
  ];

  // For non-weekly views, show all meetings (including those without dates)
  const displayMeetings = view === 'weekly' ? weekMeetings : filtered;

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelectedIds(prev => prev.length === displayMeetings.length ? [] : displayMeetings.map(m => m.id));

  return (
    <div>
      <PageHeader title="פגישות" subtitle={view === 'weekly' ? 'לוח שנה שבועי' : `${filtered.length} פגישות`}>
        <div className="flex items-center gap-2">
          <ViewToggle view={view} onViewChange={setView} options={viewOptions} />
          {view === 'weekly' && (
            <>
              <button onClick={() => setWeekOffset(w => w - 1)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted">הקודם</button>
              <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted font-medium">היום</button>
              <button onClick={() => setWeekOffset(w => w + 1)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted">הבא</button>
            </>
          )}
          <Button onClick={() => { setEditMeeting(null); setShowAdd(true); }} className="gap-1">
            <Plus className="w-4 h-4" />פגישה חדשה
          </Button>
        </div>
      </PageHeader>

      {view === 'weekly' && (
        <p className="text-sm text-muted-foreground mb-4">
          {format(weekStart, 'dd/MM', { locale: he })} — {format(weekEnd, 'dd/MM/yyyy', { locale: he })}
        </p>
      )}

      {isAdmin && <BulkDeleteBar selectedIds={selectedIds} onDelete={(ids) => bulkDeleteMutation.mutate(ids || selectedIds)} entityLabel="פגישות" />}

      {view === 'weekly' ? (
        weekMeetings.length === 0 ? (
          <EmptyState icon={Calendar} title="אין פגישות השבוע" />
        ) : (
          <div className="space-y-6">
            {Object.entries(dayGroups).sort().map(([day, dayMeetings]) => (
              <div key={day}>
                <h3 className="text-sm font-semibold font-heading mb-2 text-muted-foreground">
                  {format(new Date(day), 'EEEE, dd בMMMM', { locale: he })}
                </h3>
                <MeetingsCards
                  meetings={dayMeetings}
                  clientMap={clientMap}
                  onEdit={(m) => { setEditMeeting(m); setShowAdd(true); }}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onComplete={handleComplete}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  isAdmin={isAdmin}
                />
              </div>
            ))}
          </div>
        )
      ) : view === 'table' ? (
        displayMeetings.length === 0 ? (
          <EmptyState icon={Calendar} title="אין פגישות" />
        ) : (
          <MeetingsTable
            meetings={displayMeetings}
            clientMap={clientMap}
            quotesMap={quotesMap}
            onEdit={(m) => { setEditMeeting(m); setShowAdd(true); }}
            onDelete={(id) => deleteMutation.mutate(id)}
            onComplete={handleComplete}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
            isAdmin={isAdmin}
          />
        )
      ) : (
        displayMeetings.length === 0 ? (
          <EmptyState icon={Calendar} title="אין פגישות" />
        ) : (
          <MeetingsCards
            meetings={displayMeetings}
            clientMap={clientMap}
            onEdit={(m) => { setEditMeeting(m); setShowAdd(true); }}
            onDelete={(id) => deleteMutation.mutate(id)}
            onComplete={handleComplete}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            isAdmin={isAdmin}
          />
        )
      )}

      <AddMeetingDialog
        open={showAdd}
        onOpenChange={(open) => { setShowAdd(open); if (!open) setEditMeeting(null); }}
        initialData={editMeeting}
      />

      <IntroCompletedDialog
        open={!!introDialogMeeting}
        onOpenChange={(open) => { if (!open) setIntroDialogMeeting(null); }}
        onContinue={() => introActionMutation.mutate({ meetingId: introDialogMeeting.id, action: 'continue' })}
        onNotInterested={() => introActionMutation.mutate({ meetingId: introDialogMeeting.id, action: 'not_interested' })}
        loading={introActionMutation.isPending}
      />
    </div>
  );
}